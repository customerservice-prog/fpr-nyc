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
    status.className='status err'; status.textContent='Your request could not be sent yet. Please use FriendlyPartyRental.com while this Downstate test is being connected.';
  }finally{button.disabled=false;button.textContent='Request My Quote'}
}));
