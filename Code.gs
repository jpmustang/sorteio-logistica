/**
 * ============================================================
 *  SORTEIO — Portal de Acompanhamento de Entrega (Logística)
 *  Recebe { nome, matricula } via POST e grava na planilha.
 * ============================================================
 *
 *  SOBRE CORS (leia, é importante):
 *  O Apps Script NÃO permite definir cabeçalhos HTTP manualmente
 *  (não existe setHeader / Access-Control-Allow-Origin no ContentService).
 *  O que faz funcionar é a combinação abaixo:
 *
 *   1) O Web App publicado com acesso "Qualquer pessoa" responde com um
 *      redirecionamento para script.googleusercontent.com, e ESSA resposta
 *      já vem do Google com "Access-Control-Allow-Origin: *".
 *   2) O front-end envia com Content-Type "text/plain" — isso é uma
 *      "requisição simples" e o navegador não dispara o preflight (OPTIONS),
 *      que o Apps Script não sabe responder.
 *
 *  Por isso o index.html usa text/plain e aqui lemos e.postData.contents
 *  como JSON. Se alguém trocar para "application/json" no front, quebra.
 */

// ---------- CONFIGURAÇÃO ----------
const NOME_ABA = 'Cadastros';          // aba onde os dados ficam (criada se não existir)
const BLOQUEAR_DUPLICADOS = true;      // 1 inscrição por matrícula
const REGEX_MATRICULA = /^[A-Z]{2}\d{6}$/;
const CABECALHO = ['Data/Hora', 'Nome completo', 'Matrícula', 'Origem'];

/**
 * Recebe o POST do formulário.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Evita que dois envios simultâneos escrevam na mesma linha
    lock.waitLock(20000);

    const dados = lerCorpo_(e);
    const nome = limparNome_(dados.nome);
    const matricula = String(dados.matricula || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const origem = String(dados.origem || '').slice(0, 60);

    // Validação no servidor (nunca confie só no front-end)
    if (!nomeValido_(nome) || !REGEX_MATRICULA.test(matricula)) {
      return json_({ ok: false, erro: 'INVALIDO' });
    }

    const aba = obterAba_();

    if (BLOQUEAR_DUPLICADOS && matriculaExiste_(aba, matricula)) {
      return json_({ ok: false, erro: 'DUPLICADO' });
    }

    aba.appendRow([new Date(), protegerFormula_(nome), matricula, protegerFormula_(origem)]);
    SpreadsheetApp.flush();

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, erro: 'SERVIDOR', detalhe: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

/**
 * Teste rápido pelo navegador: abra a URL /exec e deve aparecer {"ok":true,...}
 */
function doGet(e) {
  const p = (e && e.parameter) || {};

  // Usado pelo front como "plano B" quando a resposta do POST se perde:
  // .../exec?acao=verificar&matricula=AB123456  ->  {"ok":true,"encontrado":true}
  if (p.acao === 'verificar') {
    const matricula = String(p.matricula || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!REGEX_MATRICULA.test(matricula)) return json_({ ok: false, erro: 'INVALIDO' });
    return json_({ ok: true, encontrado: matriculaExiste_(obterAba_(), matricula) });
  }

  return json_({ ok: true, status: 'Web App do sorteio no ar', aba: NOME_ABA });
}

// ---------- FUNÇÕES AUXILIARES ----------

function lerCorpo_(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (_) { /* cai no fallback */ }
  }
  // Fallback: envio como formulário (application/x-www-form-urlencoded)
  return (e && e.parameter) || {};
}

function obterAba_() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  let aba = planilha.getSheetByName(NOME_ABA);
  if (!aba) {
    aba = planilha.insertSheet(NOME_ABA);
  }
  if (aba.getLastRow() === 0) {
    aba.appendRow(CABECALHO);
    aba.getRange(1, 1, 1, CABECALHO.length).setFontWeight('bold').setBackground('#FFE9D6');
    aba.setFrozenRows(1);
    aba.getRange('C:C').setNumberFormat('@'); // matrícula como texto
  }
  return aba;
}

function matriculaExiste_(aba, matricula) {
  const ultima = aba.getLastRow();
  if (ultima < 2) return false;
  // TextFinder é bem mais rápido que ler a coluna inteira para o JS
  const achou = aba.getRange(2, 3, ultima - 1, 1)
    .createTextFinder(matricula)
    .matchEntireCell(true)
    .findNext();
  return !!achou;
}

function limparNome_(v) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function nomeValido_(n) {
  const partes = n.split(' ').filter(function (p) { return p.length >= 2; });
  return n.length >= 5 && /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/.test(n) && partes.length >= 2;
}

// Impede "injeção de fórmula" (ex.: alguém digitar =IMPORTXML(...))
function protegerFormula_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * (Opcional) Rode esta função UMA vez pelo editor para autorizar o script
 * e criar a aba com cabeçalho antes da feira.
 */
function prepararPlanilha() {
  obterAba_();
  Logger.log('Aba "' + NOME_ABA + '" pronta.');
}

/**
 * (Opcional) Sorteia 1 nome entre os cadastrados e mostra no log.
 * Rode pelo editor no dia do sorteio.
 */
function sortearUmNome() {
  const aba = obterAba_();
  const n = aba.getLastRow() - 1;
  if (n < 1) { Logger.log('Nenhum cadastro ainda.'); return; }
  const linha = 2 + Math.floor(Math.random() * n);
  const [data, nome, matricula] = aba.getRange(linha, 1, 1, 3).getValues()[0];
  Logger.log('Sorteado(a): ' + nome + ' — ' + matricula + ' (linha ' + linha + ')');
}
