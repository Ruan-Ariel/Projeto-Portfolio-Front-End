(function(){
  var $=function(s,c){return (c||document).querySelector(s)};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
  var root=document.documentElement;

  /* Loader */
  window.addEventListener('load',function(){setTimeout(function(){$('#loader').classList.add('fim')},1200)});

  /* Tema claro/escuro */
  try{var t=localStorage.getItem('tema');if(t)root.setAttribute('data-theme',t)}catch(e){}
  $('#tema').addEventListener('click',function(){
    var n=root.getAttribute('data-theme')==='dark'?'light':'dark';
    root.setAttribute('data-theme',n);try{localStorage.setItem('tema',n)}catch(e){}
  });

  /* Entrada das seções + item ativo do menu */
  root.classList.add('js');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('vis');io.unobserve(e.target)}})},{threshold:.08});
    $$('.rev').forEach(function(el){io.observe(el)});
    var spy=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){
      $$('.links a').forEach(function(a){a.classList.toggle('ativo',a.getAttribute('href')==='#'+e.target.id)})}})},{rootMargin:'-45% 0px -50% 0px'});
    $$('main section[id]').forEach(function(s){spy.observe(s)});
  }else{$$('.rev').forEach(function(el){el.classList.add('vis')})}

  /* Filtro de projetos */
  var botoes=$$('.btn-filtro'),cards=$$('.card'),contador=$('#contador-projetos'),vazio=$('#mensagem-vazio');
  botoes.forEach(function(b){b.addEventListener('click',function(){
    var t=b.dataset.tech,n=0;
    botoes.forEach(function(x){var on=x===b;x.classList.toggle('ativo',on);x.setAttribute('aria-pressed',on)});
    cards.forEach(function(c){var ok=t==='todos'||c.dataset.tech.split(' ').indexOf(t)>-1;c.hidden=!ok;if(ok)n++});
    contador.textContent='Exibindo '+n+(n===1?' projeto.':' projetos.');
    vazio.classList.toggle('oculto',n>0);
  })});

  /* Formulário */
  var f=$('#form-contato'),motivo=$('#motivo'),grupoAssunto=$('#grupo-assunto'),assunto=$('#assunto'),
      msg=$('#mensagem'),cont=$('#contador-mensagem'),resumo=$('#resumo-erros'),lista=$('#lista-erros'),
      status=$('#status-formulario'),btn=$('#btn-enviar');
  motivo.addEventListener('change',function(){
    var o=motivo.value==='outro';grupoAssunto.classList.toggle('oculto',!o);assunto.required=o;
    if(!o){assunto.value='';limpa('assunto')}
  });
  msg.maxLength=1000;
  msg.addEventListener('input',function(){cont.textContent=msg.value.length+' / 1000 caracteres (mínimo 30)'});
  function limpa(id){$('#'+id).classList.remove('invalido');$('#'+id).removeAttribute('aria-invalid');$('#erro-'+id).textContent=''}
  function erro(id,t,out){var el=$('#'+id);el.classList.add('invalido');el.setAttribute('aria-invalid','true');$('#erro-'+id).textContent=t;out.push({id:id,t:t})}
  function valida(){
    var out=[],v;['nome','email','motivo','assunto','mensagem'].forEach(limpa);
    v=$('#nome').value.trim();
    if(!v)erro('nome','Informe seu nome completo.',out);
    else if(v.length<3||v.length>80)erro('nome','O nome deve ter de 3 a 80 caracteres.',out);
    v=$('#email').value.trim();
    if(!v)erro('email','Informe seu e-mail.',out);
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))erro('email','Informe um e-mail válido, como usuario@dominio.com.',out);
    if(!motivo.value)erro('motivo','Selecione o motivo do contato.',out);
    if(motivo.value==='outro'){v=assunto.value.trim();if(v.length<5||v.length>100)erro('assunto','O assunto deve ter de 5 a 100 caracteres.',out)}
    v=msg.value.trim();
    if(v.length<30)erro('mensagem','A mensagem deve ter no mínimo 30 caracteres.',out);
    else if(v.length>1000)erro('mensagem','A mensagem deve ter no máximo 1000 caracteres.',out);
    return out;
  }
  f.addEventListener('submit',function(e){
    e.preventDefault();status.textContent='';status.className='status-formulario';
    var out=valida();
    if(out.length){
      lista.innerHTML='';
      out.forEach(function(o){var li=document.createElement('li'),a=document.createElement('a');a.href='#'+o.id;a.textContent=o.t;
        a.addEventListener('click',function(ev){ev.preventDefault();$('#'+o.id).focus()});li.appendChild(a);lista.appendChild(li)});
      resumo.classList.remove('oculto');resumo.focus();return;
    }
    resumo.classList.add('oculto');btn.disabled=true;btn.textContent='Enviando...';
    setTimeout(function(){
      btn.disabled=false;btn.textContent='Enviar mensagem';
      status.textContent='Mensagem enviada com sucesso!';status.className='status-formulario ok';
      f.reset();grupoAssunto.classList.add('oculto');cont.textContent='0 / 1000 caracteres (mínimo 30)';
    },900);
  });
})();
