/**
 * Função do Vercel: ponte entre a página e o Google Apps Script.
 *
 * Por que existe:
 *   A resposta do Apps Script volta por script.googleusercontent.com. Na rede da
 *   empresa esse trecho ficou lento (13-27 s) e às vezes devolveu 404 em HTML.
 *   Com esta função, o CELULAR só fala com o próprio site (vercel.app) e quem
 *   fala com o Google é o servidor do Vercel — sem proxy corporativo, sem cookies
 *   de contas Google do navegador, sem CORS.
 *
 * Rotas:
 *   POST /api/sorteio                                  -> cadastra (repassa ao doPost)
 *   GET  /api/sorteio?acao=verificar&matricula=AB123456 -> confere (repassa ao doGet)
 *
 * Configuração (opcional, recomendado):
 *   Vercel > Project > Settings > Environment Variables
 *   GAS_URL = https://script.google.com/macros/s/.../exec
 */

const GAS_URL_PADRAO =
  "https://script.google.com/macros/s/AKfycbxBUP6I_Yu6uSJvv7HuMoLjys29ewM1ev-JNdRYtPxnDmUPi6TWGglcwrKQrRm3A8Pagg/exec";

const TEMPO_LIMITE_MS = 25000;
const REGEX_MATRICULA = /^[A-Z]{2}\d{6}$/;

module.exports = async function handler(req, res) {
  const GAS_URL = process.env.GAS_URL || GAS_URL_PADRAO;
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      const matricula = String(req.query.matricula || "").toUpperCase();
      if (req.query.acao !== "verificar" || !REGEX_MATRICULA.test(matricula)) {
        return res.status(400).json({ ok: false, erro: "INVALIDO" });
      }
      const url = `${GAS_URL}?acao=verificar&matricula=${encodeURIComponent(matricula)}`;
      const dados = await chamarGoogle(url, { method: "GET" });
      return res.status(200).json(dados);
    }

    if (req.method === "POST") {
      // A página manda text/plain; o Vercel entrega como string. Aceita objeto também.
      let corpo = req.body;
      if (typeof corpo === "string") {
        try { corpo = JSON.parse(corpo); } catch (_) { corpo = {}; }
      }
      corpo = corpo || {};

      const payload = {
        nome: String(corpo.nome || "").slice(0, 80),
        matricula: String(corpo.matricula || "").toUpperCase().slice(0, 8),
        origem: String(corpo.origem || "").slice(0, 60),
      };
      if (!REGEX_MATRICULA.test(payload.matricula) || payload.nome.trim().length < 5) {
        return res.status(400).json({ ok: false, erro: "INVALIDO" });
      }

      const dados = await chamarGoogle(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      return res.status(200).json(dados);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, erro: "METODO" });
  } catch (err) {
    console.error("[api/sorteio]", err);
    const lento = err && err.name === "AbortError";
    return res.status(lento ? 504 : 502).json({ ok: false, erro: lento ? "TIMEOUT" : "GOOGLE" });
  }
};

/**
 * Chama o Apps Script e segue o redirecionamento para googleusercontent.
 * O fetch do Node, ao receber o 302 de um POST, faz GET no endereço novo —
 * exatamente o que o Google espera.
 */
async function chamarGoogle(url, opcoes) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TEMPO_LIMITE_MS);
  try {
    const resp = await fetch(url, { ...opcoes, redirect: "follow", signal: ctrl.signal });
    const texto = await resp.text();
    try {
      return JSON.parse(texto);
    } catch (_) {
      // Google devolveu HTML (erro/404/login). Loga o início para diagnóstico.
      console.error("[api/sorteio] resposta não-JSON", resp.status, texto.slice(0, 200));
      throw new Error("RESPOSTA_NAO_JSON");
    }
  } finally {
    clearTimeout(timer);
  }
}
