const forms=document.querySelectorAll('[data-quote-form]');
forms.forEach(form=>form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const status=form.querySelector('[data-status]');
  const button=form.querySelector('button[type="submit"]');
  button.disabled=true; button.textContent='Sending…';
  try{
    const payload=Object.fromEntries(new FormData(form).entries());
    const res=await fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||'Unable to send request');
    status.className='status ok'; status.textContent='Request received. We’ll review the date, location, and equipment before confirming availability.';
    form.reset();
  }catch(err){
    status.className='status err';
    const subject=encodeURIComponent('Downstate rental quote request — '+(payload.city||'NY')+' — '+(payload.eventDate||''));
    const body=encodeURIComponent('Name: '+(payload.name||'')+'\nEmail: '+(payload.email||'')+'\nPhone: '+(payload.phone||'')+'\nEvent date: '+(payload.eventDate||'')+'\nCity/neighborhood: '+(payload.city||'')+'\nEstimated guests: '+(payload.guests||'')+'\nItems needed: '+(payload.items||''));
    status.innerHTML='Automatic delivery is still being connected. <a href="mailto:customerservice@friendlypartyrental.com?subject='+subject+'&body='+body+'">Email this request to Friendly instead</a> or call <a href="tel:+13158841498">315-884-1498</a>.';
  }finally{button.disabled=false;button.textContent='Request My Quote'}
}));
