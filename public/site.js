const params=new URLSearchParams(location.search);
function track(name,data={}){
  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push({event:name,...data});
  window.dispatchEvent(new CustomEvent('fpr:conversion',{detail:{name,...data}}));
}
document.querySelectorAll('a[href^="tel:"]').forEach(a=>a.addEventListener('click',()=>track('phone_click',{href:a.getAttribute('href'),page:location.pathname})));
document.querySelectorAll('a[href^="mailto:"]').forEach(a=>a.addEventListener('click',()=>track('email_click',{page:location.pathname})));
document.querySelectorAll('[data-track]').forEach(el=>el.addEventListener('click',()=>track(el.dataset.track,{label:el.dataset.label||el.textContent.trim(),page:location.pathname})));

const forms=document.querySelectorAll('[data-quote-form]');
forms.forEach(form=>{
  const map={utmSource:'utm_source',utmMedium:'utm_medium',utmCampaign:'utm_campaign'};
  Object.entries(map).forEach(([field,key])=>{const input=form.elements[field];if(input)input.value=params.get(key)||''});
  if(form.elements.landingPage)form.elements.landingPage.value=location.href;
  if(form.elements.referrer)form.elements.referrer.value=document.referrer||'';
  form.addEventListener('submit',async(e)=>{
    e.preventDefault();
    const status=form.querySelector('[data-status]');
    const button=form.querySelector('button[type="submit"]');
    button.disabled=true; button.textContent='Sending…';
    const payload=Object.fromEntries(new FormData(form).entries());
    track('lead_submit_attempt',{source:payload.source,city:payload.city,eventType:payload.eventType,utmSource:payload.utmSource});
    try{
      const res=await fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'Unable to send request');
      track('lead_submit_success',{source:payload.source,city:payload.city,eventType:payload.eventType,utmSource:payload.utmSource});
      status.className='status ok'; status.textContent='Request received. We’ll review the date, location, and equipment before confirming availability.';
      form.reset();
    }catch(err){
      track('lead_submit_fallback',{source:payload.source,city:payload.city,eventType:payload.eventType,utmSource:payload.utmSource});
      status.className='status err';
      const subject=encodeURIComponent('Downstate rental quote request — '+(payload.city||'NY')+' — '+(payload.eventDate||''));
      const body=encodeURIComponent('Name: '+(payload.name||'')+'\nEmail: '+(payload.email||'')+'\nPhone: '+(payload.phone||'')+'\nEvent date: '+(payload.eventDate||'')+'\nCity/neighborhood: '+(payload.city||'')+'\nEstimated guests: '+(payload.guests||'')+'\nEvent type: '+(payload.eventType||'')+'\nSurface: '+(payload.surface||'')+'\nItems needed: '+(payload.items||''));
      status.innerHTML='We couldn’t send the form automatically. <a href="mailto:customerservice@friendlypartyrental.com?subject='+subject+'&body='+body+'">Email this request to Friendly</a> or call <a href="tel:+13158841498">(315) 884-1498</a>.';
    }finally{button.disabled=false;button.textContent='Request My Quote'}
  });
});
