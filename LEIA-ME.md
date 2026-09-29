# Sorteio · Portal de Acompanhamento de Entrega

Arquivos desta pasta:

| Arquivo | Para que serve | Onde vai |
|---|---|---|
| `index.html` | A página (HTML + CSS + JS num arquivo só) | Vercel |
| `Code.gs` | O "back-end" que grava na planilha | Apps Script da planilha |
| `LEIA-ME.md` | Este guia | Só para você |

A ordem importa: **primeiro o Apps Script** (ele gera a URL), **depois o `index.html`** (recebe essa URL), **por último o Vercel**.

---

## Parte 1 — Publicar o Apps Script (≈ 10 min)

### 1.1 Colar o código
1. Abra a planilha no Google Sheets.
2. Menu **Extensões → Apps Script**. Abre uma aba nova com um arquivo `Código.gs`.
3. Apague tudo o que estiver lá e cole o conteúdo de `Code.gs`.
4. Clique no ícone de disquete (**Salvar**) ou `Ctrl + S`.

### 1.2 Autorizar (só na primeira vez)
1. No topo do editor, no seletor de funções, escolha **`prepararPlanilha`** e clique em **Executar**.
2. Vai aparecer "Autorização necessária" → **Revisar permissões** → escolha sua conta.
3. Se aparecer "O Google não verificou este app": clique em **Avançado → Acessar (nome do projeto) (não seguro)** → **Permitir**.
   Isso é normal: o "app" é o seu próprio script.
4. Volte à planilha: deve existir uma aba **Cadastros** com o cabeçalho.

### 1.3 Publicar como Web App
1. No editor, botão azul **Implantar → Nova implantação**.
2. Na engrenagem ao lado de "Selecionar tipo", escolha **App da Web**.
3. Preencha:
   - **Descrição:** `sorteio v1`
   - **Executar como:** **Eu** (seu e-mail)
   - **Quem pode acessar:** **Qualquer pessoa**
4. Clique **Implantar** e copie a **URL do app da Web** (termina em `/exec`).

> **Por que "Qualquer pessoa"?** Quem acessa pelo celular não está logado na sua conta Google. Se escolher "Somente usuários da Intelbras", o celular pessoal recebe uma tela de login no lugar do JSON e o envio falha.
> Se a sua conta corporativa **não mostrar** a opção "Qualquer pessoa", é bloqueio do administrador do Google Workspace — fale com a TI ou use uma planilha em conta pessoal.

### 1.4 Testar a URL
Cole a URL `/exec` no navegador. Deve aparecer:
```
{"ok":true,"status":"Web App do sorteio no ar","aba":"Cadastros"}
```
Se aparecer isso, o back-end está pronto.

### ⚠️ Pegadinha nº 1: alterou o código? Precisa de nova versão
O Web App roda a **versão implantada**, não o que está salvo no editor.
Depois de qualquer mudança no `Code.gs`: **Implantar → Gerenciar implantações → lápis (editar) → Versão: "Nova versão" → Implantar**.
Assim a URL continua a mesma. (Se criar "Nova implantação", a URL muda e você terá de atualizar o `index.html`.)

---

## Parte 2 — Ligar a página à planilha (1 min)

1. Abra `index.html` em qualquer editor de texto (Bloco de Notas, VS Code).
2. Procure a linha:
   ```js
   const URL_APPS_SCRIPT = "COLE_AQUI_A_URL_DO_WEB_APP/exec";
   ```
3. Troque pelo endereço copiado no passo 1.3, mantendo as aspas.
4. Salve.

**Testar localmente:** dê dois cliques no `index.html`, preencha e envie. Confira se a linha apareceu na aba **Cadastros**.
**Testar só o visual (sem gravar nada):** abra a página com `?demo=1` no fim do endereço.

---

## Parte 3 — Publicar no Vercel

O Vercel entende a pasta como um site estático: não precisa de build nem de configuração.

### Caminho A — Pelo site, via GitHub (sem terminal)
1. Crie um repositório no GitHub (ex.: `sorteio-logistica`) e envie os arquivos pelo botão **Add file → Upload files** (basta o `index.html`; não suba o `Code.gs` se quiser manter o back-end fora do repositório público).
2. Entre em **vercel.com** → login com GitHub → **Add New… → Project**.
3. Escolha o repositório → **Import**.
4. Em **Framework Preset**, selecione **Other**. Deixe *Build Command* e *Output Directory* **vazios**.
5. **Deploy**. Em ~30 s você recebe um endereço como `sorteio-logistica.vercel.app`.
6. Cada novo commit no GitHub publica sozinho uma nova versão.

### Caminho B — Pelo terminal (Vercel CLI)
Precisa do Node.js instalado.
```bash
cd pasta-onde-esta-o-index
npx vercel           # primeira vez: faz login e cria o projeto (aceite os padrões)
npx vercel --prod    # publica em produção
```

### Depois do deploy
1. Abra o endereço no **celular, usando 4G** (não o Wi-Fi da empresa — alguns proxies corporativos bloqueiam `script.google.com`).
2. Faça um cadastro de teste e confira a planilha. Apague a linha de teste depois.
3. Gere o QR Code apontando para o endereço `.vercel.app` (qualquer gerador de QR serve; teste lendo com 2 celulares diferentes antes de imprimir).

---

## Dia do sorteio
No editor do Apps Script, rode a função **`sortearUmNome`** e veja o resultado em **Registro de execução**. Ou use a própria planilha, como preferir.

---

## Problemas comuns

| Sintoma | Causa provável | Como resolver |
|---|---|---|
| "A página ainda não foi ligada à planilha" | URL não colada no `index.html` | Parte 2 |
| "O caminhão atolou" em todo envio | Web App não está como "Qualquer pessoa", ou URL errada | Refaça 1.3 e teste 1.4 |
| Linha grava na planilha, mas a página dá erro | A resposta volta por `script.googleusercontent.com` e demora 20–30 s em algumas redes | A página já espera 45 s e confere na planilha se gravou. Confirme que a versão nova do `Code.gs` foi implantada (Pegadinha nº 1) |
| Funciona no 4G, falha no Wi-Fi da empresa | Proxy/firewall bloqueando Google | Peça liberação de `script.google.com` e `script.googleusercontent.com` |
| Mudei o `Code.gs` e nada mudou | Não criou nova versão | Pegadinha nº 1 |
| "Essa matrícula já está participando" | Bloqueio de duplicados (intencional) | Para desligar: `BLOQUEAR_DUPLICADOS = false` + nova versão |
| Celular mostra "Você já está participando" | Página lembra a inscrição no aparelho | Botão "Cadastrar outra pessoa" |

---

## Privacidade (importante)
O link da planilha foi compartilhado como **"Qualquer pessoa com o link pode ver"**. Isso significa que quem tiver o link vê **nomes e matrículas** de todo mundo.
O Apps Script **não precisa** da planilha pública — ele roda com a sua conta. Recomendo mudar o compartilhamento para **Restrito** antes da feira.
