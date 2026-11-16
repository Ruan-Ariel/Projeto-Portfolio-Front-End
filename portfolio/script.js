const MENSAGEM_MINIMA = 30;
const MENSAGEM_MAXIMA = 1000;
const ENDPOINT = 'https://qrwfxthwkrshhambttav.supabase.co/functions/v1/send-contact';

const $ = (seletor, contexto = document) => contexto.querySelector(seletor);
const $$ = (seletor, contexto = document) => [...contexto.querySelectorAll(seletor)];
const esperar = (milissegundos) => new Promise((resolver) => setTimeout(resolver, milissegundos));

const raiz = document.documentElement;

function iniciarTelaDeCarregamento() {
  window.addEventListener('load', async () => {
    await esperar(1200);
    $('#loader').classList.add('fim');
  });
}

function iniciarTema() {
  const botaoTema = $('#tema');

  try {
    const temaSalvo = localStorage.getItem('tema');
    if (temaSalvo) raiz.setAttribute('data-theme', temaSalvo);
  } catch (erro) {}

  botaoTema.addEventListener('click', () => {
    const novoTema = raiz.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    raiz.setAttribute('data-theme', novoTema);

    try {
      localStorage.setItem('tema', novoTema);
    } catch (erro) {}
  });
}

function iniciarAnimacaoDeEntrada() {
  raiz.classList.add('js');

  const secoes = $$('.rev');

  if (!('IntersectionObserver' in window)) {
    secoes.forEach((secao) => secao.classList.add('vis'));
    return;
  }

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('vis');
        observador.unobserve(entrada.target);
      });
    },
    { threshold: 0.08 }
  );

  secoes.forEach((secao) => observador.observe(secao));
}

function iniciarMenuAtivo() {
  if (!('IntersectionObserver' in window)) return;

  const linksDoMenu = $$('.links a');

  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;

        linksDoMenu.forEach((link) => {
          const apontaParaSecao = link.getAttribute('href') === `#${entrada.target.id}`;
          link.classList.toggle('ativo', apontaParaSecao);
        });
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );

  $$('main section[id]').forEach((secao) => observador.observe(secao));
}

function digitar(elemento, texto, velocidade) {
  const destino = elemento.querySelector('.digita');

  return new Promise((resolver) => {
    let letrasExibidas = 0;

    function mostrarProximaLetra() {
      letrasExibidas += 1;
      destino.textContent = texto.slice(0, letrasExibidas);

      if (letrasExibidas < texto.length) {
        setTimeout(mostrarProximaLetra, velocidade + Math.random() * 40);
      } else {
        resolver();
      }
    }

    mostrarProximaLetra();
  });
}

async function iniciarDigitacao() {
  const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const elementos = $$('.hero h2, .hero-texto > p:not(.conectar)');

  if (reduzMovimento || elementos.length === 0) return;

  const itens = elementos.map((elemento) => {
    const texto = elemento.textContent.trim();

    elemento.style.minHeight = `${elemento.offsetHeight}px`;
    elemento.setAttribute('aria-label', texto);
    elemento.innerHTML = '<span class="digita" aria-hidden="true"></span>';

    return { elemento, texto };
  });

  await esperar(1500);

  for (const [posicao, item] of itens.entries()) {
    itens.forEach((outro, indice) => {
      outro.elemento.classList.toggle('cursor', indice === posicao);
    });

    const velocidade = posicao === 0 ? 55 : 22;
    await digitar(item.elemento, item.texto, velocidade);
    await esperar(250);
  }
}

function iniciarFiltroDeProjetos() {
  const botoes = $$('.btn-filtro');
  const projetos = $$('.projeto');
  const contador = $('#contador-projetos');
  const mensagemVazio = $('#mensagem-vazio');

  botoes.forEach((botao) => {
    botao.addEventListener('click', () => {
      const tecnologia = botao.dataset.tech;
      let projetosVisiveis = 0;

      botoes.forEach((outroBotao) => {
        const estaAtivo = outroBotao === botao;
        outroBotao.classList.toggle('ativo', estaAtivo);
        outroBotao.setAttribute('aria-pressed', estaAtivo);
      });

      projetos.forEach((projeto) => {
        const tecnologias = projeto.dataset.tech.split(' ');
        const deveMostrar = tecnologia === 'todos' || tecnologias.includes(tecnologia);

        projeto.hidden = !deveMostrar;
        if (deveMostrar) projetosVisiveis += 1;
      });

      const palavra = projetosVisiveis === 1 ? 'projeto' : 'projetos';
      contador.textContent = `Exibindo ${projetosVisiveis} ${palavra}.`;
      mensagemVazio.classList.toggle('oculto', projetosVisiveis > 0);
    });
  });
}

function iniciarFormulario() {
  const formulario = $('#form-contato');
  const campoMotivo = $('#motivo');
  const grupoAssunto = $('#grupo-assunto');
  const campoAssunto = $('#assunto');
  const campoMensagem = $('#mensagem');
  const contadorMensagem = $('#contador-mensagem');
  const resumoErros = $('#resumo-erros');
  const listaErros = $('#lista-erros');
  const statusFormulario = $('#status-formulario');
  const botaoEnviar = $('#btn-enviar');

  const camposValidados = ['nome', 'email', 'motivo', 'assunto', 'mensagem'];
  const textoContador = (quantidade) =>
    `${quantidade} / ${MENSAGEM_MAXIMA} caracteres (mínimo ${MENSAGEM_MINIMA})`;

  campoMensagem.maxLength = MENSAGEM_MAXIMA;

  function limparErro(id) {
    const campo = $(`#${id}`);
    campo.classList.remove('invalido');
    campo.removeAttribute('aria-invalid');
    $(`#erro-${id}`).textContent = '';
  }

  function mostrarErro(id, texto, erros) {
    const campo = $(`#${id}`);
    campo.classList.add('invalido');
    campo.setAttribute('aria-invalid', 'true');
    $(`#erro-${id}`).textContent = texto;
    erros.push({ id, texto });
  }

  function exibirResumoDeErros(erros) {
    listaErros.innerHTML = '';

    erros.forEach(({ id, texto }) => {
      const item = document.createElement('li');
      const link = document.createElement('a');

      link.href = `#${id}`;
      link.textContent = texto;
      link.addEventListener('click', (evento) => {
        evento.preventDefault();
        $(`#${id}`).focus();
      });

      item.appendChild(link);
      listaErros.appendChild(item);
    });

    resumoErros.classList.remove('oculto');
    resumoErros.focus();
  }

  function validar() {
    const erros = [];
    camposValidados.forEach(limparErro);

    const nome = $('#nome').value.trim();
    if (!nome) {
      mostrarErro('nome', 'Informe seu nome completo.', erros);
    } else if (nome.length < 3 || nome.length > 80) {
      mostrarErro('nome', 'O nome deve ter de 3 a 80 caracteres.', erros);
    }

    const email = $('#email').value.trim();
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!email) {
      mostrarErro('email', 'Informe seu e-mail.', erros);
    } else if (!emailValido) {
      mostrarErro('email', 'Informe um e-mail válido, como usuario@dominio.com.', erros);
    }

    if (!campoMotivo.value) {
      mostrarErro('motivo', 'Selecione o motivo do contato.', erros);
    }

    if (campoMotivo.value === 'outro') {
      const assunto = campoAssunto.value.trim();
      if (assunto.length < 5 || assunto.length > 100) {
        mostrarErro('assunto', 'O assunto deve ter de 5 a 100 caracteres.', erros);
      }
    }

    const mensagem = campoMensagem.value.trim();
    if (mensagem.length < MENSAGEM_MINIMA) {
      mostrarErro('mensagem', `A mensagem deve ter no mínimo ${MENSAGEM_MINIMA} caracteres.`, erros);
    } else if (mensagem.length > MENSAGEM_MAXIMA) {
      mostrarErro('mensagem', `A mensagem deve ter no máximo ${MENSAGEM_MAXIMA} caracteres.`, erros);
    }

    return erros;
  }

  function lerDadosDoFormulario() {
    return {
      nome: $('#nome').value.trim(),
      email: $('#email').value.trim(),
      motivo: campoMotivo.value,
      assunto: campoAssunto.value.trim(),
      mensagem: campoMensagem.value.trim(),
      website: $('#website').value,
    };
  }

  function mostrarStatus(texto, tipo) {
    statusFormulario.textContent = texto;
    statusFormulario.className = `status-formulario ${tipo}`;
  }

  function limparFormulario() {
    formulario.reset();
    grupoAssunto.classList.add('oculto');
    contadorMensagem.textContent = textoContador(0);
  }

  function mostrarErrosDoServidor(errosDoServidor) {
    const erros = [];

    Object.entries(errosDoServidor).forEach(([id, texto]) => {
      if ($(`#erro-${id}`)) mostrarErro(id, texto, erros);
    });

    exibirResumoDeErros(erros);
  }

  async function enviarMensagem() {
    botaoEnviar.disabled = true;
    botaoEnviar.textContent = 'Enviando...';

    try {
      const resposta = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lerDadosDoFormulario()),
      });
      const corpo = await resposta.json().catch(() => ({}));

      if (resposta.ok && corpo.ok) {
        mostrarStatus('Mensagem enviada com sucesso!', 'ok');
        limparFormulario();
      } else if (resposta.status === 422 && corpo.errors) {
        mostrarErrosDoServidor(corpo.errors);
      } else {
        mostrarStatus(corpo.error || 'Não foi possível enviar agora. Tente novamente.', 'falha');
      }
    } catch (erro) {
      mostrarStatus('Falha de conexão. Tente novamente.', 'falha');
    } finally {
      botaoEnviar.disabled = false;
      botaoEnviar.textContent = 'Enviar mensagem';
    }
  }

  campoMotivo.addEventListener('change', () => {
    const escolheuOutro = campoMotivo.value === 'outro';

    grupoAssunto.classList.toggle('oculto', !escolheuOutro);
    campoAssunto.required = escolheuOutro;

    if (!escolheuOutro) {
      campoAssunto.value = '';
      limparErro('assunto');
    }
  });

  campoMensagem.addEventListener('input', () => {
    contadorMensagem.textContent = textoContador(campoMensagem.value.length);
  });

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    statusFormulario.textContent = '';
    statusFormulario.className = 'status-formulario';

    const erros = validar();

    if (erros.length > 0) {
      exibirResumoDeErros(erros);
      return;
    }

    resumoErros.classList.add('oculto');
    enviarMensagem();
  });
}

iniciarTelaDeCarregamento();
iniciarTema();
iniciarAnimacaoDeEntrada();
iniciarMenuAtivo();
iniciarDigitacao();
iniciarFiltroDeProjetos();
iniciarFormulario();
