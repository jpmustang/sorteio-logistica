# Inlover Truck · Sorteio do Portal de Acompanhamento de Entrega

Página mobile, acessada por QR Code, para o sorteio de brindes da equipe de **Logística** na feira interna.
Além do cadastro, a página conta a história do **Portal de Acompanhamento de Entrega** (notas em atraso, entregues, agendamentos e dados das regiões) e termina com um pedido de voto no estande.

> *A gente não move caixas. A gente conecta pessoas.*

---

## Como funciona

```
Celular (index.html no Vercel)
   │  POST /api/sorteio  (mesmo domínio, sem CORS)
   ▼
Função do Vercel (api/sorteio.js)  ← fala com o Google pelo servidor
   │  POST { nome, matricula }
   ▼
Google Apps Script (Web App, Code.gs)
   │  valida → bloqueia duplicado → grava
   ▼
Google Sheets (aba "Cadastros")
```

- **Front-end:** HTML, CSS e JavaScript puros, num arquivo só (`index.html`). Não tem build nem dependências; só as fontes vêm do Google Fonts.
- **Back-end:** um Web App do Google Apps Script ligado à planilha.
- **Ponte:** uma função do Vercel (`api/sorteio.js`). O celular não fala direto com o Google, porque na rede da empresa a resposta via `script.googleusercontent.com` ficava lenta ou voltava 404.
- **Hospedagem:** Vercel (site estático + 1 função).

## Estrutura

| Arquivo | O que é |
|---|---|
| `index.html` | A página: visual, mascote Inlover Truck, máscara, validação e envio |
| `api/sorteio.js` | Função do Vercel que repassa o cadastro ao Apps Script |
| `vercel.json` | Dá até 30 s de limite à função |
| `Code.gs` | Script que recebe o cadastro e grava na planilha. **Não roda no Vercel**: é colado no Apps Script |
| `LEIA-ME.md` | Guia detalhado de configuração e solução de problemas |
| `README.md` | Este arquivo |

## Funcionalidades

- **Mascote Inlover Truck**, que reage ao preenchimento: olha para o campo, sorri quando o dado está certo e fica preocupado quando está errado.
- **Barra de rastreio** que vai de *Coleta* até *Entregue* conforme a pessoa preenche.
- **Matrícula com máscara em tempo real:** exatamente 2 letras + 6 números (`^[A-Z]{2}\d{6}$`), validada no navegador e de novo no servidor.
- **Botão com estados** (carregando e check), confetes e um comprovante de participação.
- **Uma inscrição por matrícula:** quem já está cadastrado vê *"Você já está participando!"*.
- **Tolerante a rede lenta:** espera até 45 s pela resposta. Se ela não chegar, confere na planilha se o cadastro foi gravado.
- **Proteções:** honeypot contra robôs, bloqueio de injeção de fórmula na planilha e trava contra gravações simultâneas.
- **Acessibilidade:** respeita a opção do sistema *"reduzir movimento"*.
- **Modo demonstração:** abra a página com `?demo=1` para testar sem gravar nada.

## Paleta

| Uso | Cor |
|---|---|
| Petróleo (fundo e textos de destaque) | `#002D31` |
| Verde principal | `#00B370` |
| Verde médio | `#00CD87` |
| Verde claro (brilho) | `#6EF3C5` |
| Verde profundo (sombra) | `#00422B` |

As cores ficam em variáveis CSS no começo do `index.html` (`:root`).

---

## Configuração

### 1. Apps Script (back-end)
1. Abra a planilha → **Extensões → Apps Script**.
2. Cole o conteúdo de `Code.gs` e salve.
3. Rode a função `prepararPlanilha` uma vez para autorizar o script e criar a aba **Cadastros**.
4. **Implantar → Nova implantação → App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Copie a URL que termina em `/exec`.

> Alterou o `Code.gs`? Vá em **Implantar → Gerenciar implantações → editar → Nova versão**. Assim a URL continua a mesma.

### 2. Ligar a página ao script
No `index.html`, procure a linha abaixo e coloque a URL copiada:
```js
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/.../exec";
```

### 3. (Recomendado) Esconder a URL do script
No Vercel, abra **Settings → Environment Variables** e crie a variável `GAS_URL` com a URL `/exec`. Depois, clique em **Redeploy**. Sem essa variável, a função usa a URL que está escrita no `api/sorteio.js`.

### 4. Deploy no Vercel
1. Em [vercel.com](https://vercel.com), escolha **Add New → Project** e importe este repositório.
2. **Framework Preset:** `Other`. Deixe *Build Command* e *Output Directory* vazios.
3. Clique em **Deploy**. A cada novo commit, o Vercel publica sozinho.

### 5. QR Code
Gere o QR Code apontando para o endereço `https://<projeto>.vercel.app`. Teste com dois celulares, **usando 4G**, antes de imprimir.

---

## Dia do sorteio
No editor do Apps Script, rode `sortearUmNome()` e veja o resultado em **Registro de execução**.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| A linha grava na planilha, mas a página dá erro | A resposta do Google demorou. Confirme que a versão nova do `Code.gs` foi implantada |
| Falha em todo envio | Confira se o Web App está como **Qualquer pessoa** e teste a URL `/exec` no navegador |
| Funciona no 4G e falha no Wi-Fi da empresa | Peça à TI a liberação de `script.google.com` e `script.googleusercontent.com` |

Mais detalhes no [`LEIA-ME.md`](LEIA-ME.md).

## Privacidade
- Os dados (nome e matrícula) servem **apenas** para o sorteio desta feira.
- Deixe o compartilhamento da planilha como **Restrito**. O script não precisa que ela seja pública.
- A URL do Web App fica visível no código. Por isso, prefira manter o repositório **privado**.

---

Feito com carinho pela equipe de Logística.
