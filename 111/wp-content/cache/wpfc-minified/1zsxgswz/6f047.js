(function($){
'use strict';
if(typeof wpcf7==='undefined'||wpcf7===null){
return;
}
wpcf7=$.extend({
cached: 0,
inputs: []
}, wpcf7);
$(function(){
wpcf7.supportHtml5=(function(){
var features={};
var input=document.createElement('input');
features.placeholder='placeholder' in input;
var inputTypes=[ 'email', 'url', 'tel', 'number', 'range', 'date' ];
$.each(inputTypes, function(index, value){
input.setAttribute('type', value);
features[ value ]=input.type!=='text';
});
return features;
})();
$('div.wpcf7 > form').each(function(){
var $form=$(this);
wpcf7.initForm($form);
if(wpcf7.cached){
wpcf7.refill($form);
}});
});
wpcf7.getId=function(form){
return parseInt($('input[name="_wpcf7"]', form).val(), 10);
};
wpcf7.initForm=function(form){
var $form=$(form);
$form.submit(function(event){
if(! wpcf7.supportHtml5.placeholder){
$('[placeholder].placeheld', $form).each(function(i, n){
$(n).val('').removeClass('placeheld');
});
}
if(typeof window.FormData==='function'){
wpcf7.submit($form);
event.preventDefault();
}});
$('.wpcf7-submit', $form).after('<span class="ajax-loader"></span>');
wpcf7.toggleSubmit($form);
$form.on('click', '.wpcf7-acceptance', function(){
wpcf7.toggleSubmit($form);
});
$('.wpcf7-exclusive-checkbox', $form).on('click', 'input:checkbox', function(){
var name=$(this).attr('name');
$form.find('input:checkbox[name="' + name + '"]').not(this).prop('checked', false);
});
$('.wpcf7-list-item.has-free-text', $form).each(function(){
var $freetext=$(':input.wpcf7-free-text', this);
var $wrap=$(this).closest('.wpcf7-form-control');
if($(':checkbox, :radio', this).is(':checked')){
$freetext.prop('disabled', false);
}else{
$freetext.prop('disabled', true);
}
$wrap.on('change', ':checkbox, :radio', function(){
var $cb=$('.has-free-text', $wrap).find(':checkbox, :radio');
if($cb.is(':checked')){
$freetext.prop('disabled', false).focus();
}else{
$freetext.prop('disabled', true);
}});
});
if(! wpcf7.supportHtml5.placeholder){
$('[placeholder]', $form).each(function(){
$(this).val($(this).attr('placeholder'));
$(this).addClass('placeheld');
$(this).focus(function(){
if($(this).hasClass('placeheld')){
$(this).val('').removeClass('placeheld');
}});
$(this).blur(function(){
if(''===$(this).val()){
$(this).val($(this).attr('placeholder'));
$(this).addClass('placeheld');
}});
});
}
if(wpcf7.jqueryUi&&! wpcf7.supportHtml5.date){
$form.find('input.wpcf7-date[type="date"]').each(function(){
$(this).datepicker({
dateFormat: 'yy-mm-dd',
minDate: new Date($(this).attr('min')),
maxDate: new Date($(this).attr('max'))
});
});
}
if(wpcf7.jqueryUi&&! wpcf7.supportHtml5.number){
$form.find('input.wpcf7-number[type="number"]').each(function(){
$(this).spinner({
min: $(this).attr('min'),
max: $(this).attr('max'),
step: $(this).attr('step')
});
});
}
wpcf7.resetCounter($form);
$form.on('change', '.wpcf7-validates-as-url', function(){
var val=$.trim($(this).val());
if(val
&& ! val.match(/^[a-z][a-z0-9.+-]*:/i)
&& -1!==val.indexOf('.')){
val=val.replace(/^\/+/, '');
val='http://' + val;
}
$(this).val(val);
});
};
wpcf7.submit=function(form){
if(typeof window.FormData!=='function'){
return;
}
var $form=$(form);
$('.ajax-loader', $form).addClass('is-active');
wpcf7.clearResponse($form);
var formData=new FormData($form.get(0));
var detail={
id: $form.closest('div.wpcf7').attr('id'),
status: 'init',
inputs: [],
formData: formData
};
$.each($form.serializeArray(), function(i, field){
if('_wpcf7'==field.name){
detail.contactFormId=field.value;
}else if('_wpcf7_version'==field.name){
detail.pluginVersion=field.value;
}else if('_wpcf7_locale'==field.name){
detail.contactFormLocale=field.value;
}else if('_wpcf7_unit_tag'==field.name){
detail.unitTag=field.value;
}else if('_wpcf7_container_post'==field.name){
detail.containerPostId=field.value;
}else if(field.name.match(/^_wpcf7_\w+_free_text_/)){
var owner=field.name.replace(/^_wpcf7_\w+_free_text_/, '');
detail.inputs.push({
name: owner + '-free-text',
value: field.value
});
}else if(field.name.match(/^_/)){
}else{
detail.inputs.push(field);
}});
wpcf7.triggerEvent($form.closest('div.wpcf7'), 'beforesubmit', detail);
var ajaxSuccess=function(data, status, xhr, $form){
detail.id=$(data.into).attr('id');
detail.status=data.status;
detail.apiResponse=data;
var $message=$('.wpcf7-response-output', $form);
switch(data.status){
case 'validation_failed':
$.each(data.invalidFields, function(i, n){
$(n.into, $form).each(function(){
wpcf7.notValidTip(this, n.message);
$('.wpcf7-form-control', this).addClass('wpcf7-not-valid');
$('[aria-invalid]', this).attr('aria-invalid', 'true');
});
});
$message.addClass('wpcf7-validation-errors');
$form.addClass('invalid');
wpcf7.triggerEvent(data.into, 'invalid', detail);
break;
case 'acceptance_missing':
$message.addClass('wpcf7-acceptance-missing');
$form.addClass('unaccepted');
wpcf7.triggerEvent(data.into, 'unaccepted', detail);
break;
case 'spam':
$message.addClass('wpcf7-spam-blocked');
$form.addClass('spam');
wpcf7.triggerEvent(data.into, 'spam', detail);
break;
case 'aborted':
$message.addClass('wpcf7-aborted');
$form.addClass('aborted');
wpcf7.triggerEvent(data.into, 'aborted', detail);
break;
case 'mail_sent':
$message.addClass('wpcf7-mail-sent-ok');
$form.addClass('sent');
wpcf7.triggerEvent(data.into, 'mailsent', detail);
break;
case 'mail_failed':
$message.addClass('wpcf7-mail-sent-ng');
$form.addClass('failed');
wpcf7.triggerEvent(data.into, 'mailfailed', detail);
break;
default:
var customStatusClass='custom-'
+ data.status.replace(/[^0-9a-z]+/i, '-');
$message.addClass('wpcf7-' + customStatusClass);
$form.addClass(customStatusClass);
}
wpcf7.refill($form, data);
wpcf7.triggerEvent(data.into, 'submit', detail);
if('mail_sent'==data.status){
$form.each(function(){
this.reset();
});
wpcf7.toggleSubmit($form);
wpcf7.resetCounter($form);
}
if(! wpcf7.supportHtml5.placeholder){
$form.find('[placeholder].placeheld').each(function(i, n){
$(n).val($(n).attr('placeholder'));
});
}
$message.html('').append(data.message).slideDown('fast');
$message.attr('role', 'alert');
$('.screen-reader-response', $form.closest('.wpcf7')).each(function(){
var $response=$(this);
$response.html('').attr('role', '').append(data.message);
if(data.invalidFields){
var $invalids=$('<ul></ul>');
$.each(data.invalidFields, function(i, n){
if(n.idref){
var $li=$('<li></li>').append($('<a></a>').attr('href', '#' + n.idref).append(n.message));
}else{
var $li=$('<li></li>').append(n.message);
}
$invalids.append($li);
});
$response.append($invalids);
}
$response.attr('role', 'alert').focus();
});
};
$.ajax({
type: 'POST',
url: wpcf7.apiSettings.getRoute('/contact-forms/' + wpcf7.getId($form) + '/feedback'),
data: formData,
dataType: 'json',
processData: false,
contentType: false
}).done(function(data, status, xhr){
ajaxSuccess(data, status, xhr, $form);
$('.ajax-loader', $form).removeClass('is-active');
}).fail(function(xhr, status, error){
var $e=$('<div class="ajax-error"></div>').text(error.message);
$form.after($e);
});
};
wpcf7.triggerEvent=function(target, name, detail){
var $target=$(target);
var event=new CustomEvent('wpcf7' + name, {
bubbles: true,
detail: detail
});
$target.get(0).dispatchEvent(event);
$target.trigger('wpcf7:' + name, detail);
$target.trigger(name + '.wpcf7', detail);
};
wpcf7.toggleSubmit=function(form, state){
var $form=$(form);
var $submit=$('input:submit', $form);
if(typeof state!=='undefined'){
$submit.prop('disabled', ! state);
return;
}
if($form.hasClass('wpcf7-acceptance-as-validation')){
return;
}
$submit.prop('disabled', false);
$('.wpcf7-acceptance', $form).each(function(){
var $span=$(this);
var $input=$('input:checkbox', $span);
if(! $span.hasClass('optional')){
if($span.hasClass('invert')&&$input.is(':checked')
|| ! $span.hasClass('invert')&&! $input.is(':checked')){
$submit.prop('disabled', true);
return false;
}}
});
};
wpcf7.resetCounter=function(form){
var $form=$(form);
$('.wpcf7-character-count', $form).each(function(){
var $count=$(this);
var name=$count.attr('data-target-name');
var down=$count.hasClass('down');
var starting=parseInt($count.attr('data-starting-value'), 10);
var maximum=parseInt($count.attr('data-maximum-value'), 10);
var minimum=parseInt($count.attr('data-minimum-value'), 10);
var updateCount=function(target){
var $target=$(target);
var length=$target.val().length;
var count=down ? starting - length:length;
$count.attr('data-current-value', count);
$count.text(count);
if(maximum&&maximum < length){
$count.addClass('too-long');
}else{
$count.removeClass('too-long');
}
if(minimum&&length < minimum){
$count.addClass('too-short');
}else{
$count.removeClass('too-short');
}};
$(':input[name="' + name + '"]', $form).each(function(){
updateCount(this);
$(this).keyup(function(){
updateCount(this);
});
});
});
};
wpcf7.notValidTip=function(target, message){
var $target=$(target);
$('.wpcf7-not-valid-tip', $target).remove();
$('<span></span>').attr({
'class': 'wpcf7-not-valid-tip',
'role': 'alert',
'aria-hidden': 'true',
}).text(message).appendTo($target);
if($target.is('.use-floating-validation-tip *')){
var fadeOut=function(target){
$(target).not(':hidden').animate({
opacity: 0
}, 'fast', function(){
$(this).css({ 'z-index': -100 });
});
};
$target.on('mouseover', '.wpcf7-not-valid-tip', function(){
fadeOut(this);
});
$target.on('focus', ':input', function(){
fadeOut($('.wpcf7-not-valid-tip', $target));
});
}};
wpcf7.refill=function(form, data){
var $form=$(form);
var refillCaptcha=function($form, items){
$.each(items, function(i, n){
$form.find(':input[name="' + i + '"]').val('');
$form.find('img.wpcf7-captcha-' + i).attr('src', n);
var match=/([0-9]+)\.(png|gif|jpeg)$/.exec(n);
$form.find('input:hidden[name="_wpcf7_captcha_challenge_' + i + '"]').attr('value', match[ 1 ]);
});
};
var refillQuiz=function($form, items){
$.each(items, function(i, n){
$form.find(':input[name="' + i + '"]').val('');
$form.find(':input[name="' + i + '"]').siblings('span.wpcf7-quiz-label').text(n[ 0 ]);
$form.find('input:hidden[name="_wpcf7_quiz_answer_' + i + '"]').attr('value', n[ 1 ]);
});
};
if(typeof data==='undefined'){
$.ajax({
type: 'GET',
url: wpcf7.apiSettings.getRoute('/contact-forms/' + wpcf7.getId($form) + '/refill'),
beforeSend: function(xhr){
var nonce=$form.find(':input[name="_wpnonce"]').val();
if(nonce){
xhr.setRequestHeader('X-WP-Nonce', nonce);
}},
dataType: 'json'
}).done(function(data, status, xhr){
if(data.captcha){
refillCaptcha($form, data.captcha);
}
if(data.quiz){
refillQuiz($form, data.quiz);
}});
}else{
if(data.captcha){
refillCaptcha($form, data.captcha);
}
if(data.quiz){
refillQuiz($form, data.quiz);
}}
};
wpcf7.clearResponse=function(form){
var $form=$(form);
$form.removeClass('invalid spam sent failed');
$form.siblings('.screen-reader-response').html('').attr('role', '');
$('.wpcf7-not-valid-tip', $form).remove();
$('[aria-invalid]', $form).attr('aria-invalid', 'false');
$('.wpcf7-form-control', $form).removeClass('wpcf7-not-valid');
$('.wpcf7-response-output', $form)
.hide().empty().removeAttr('role')
.removeClass('wpcf7-mail-sent-ok wpcf7-mail-sent-ng wpcf7-validation-errors wpcf7-spam-blocked');
};
wpcf7.apiSettings.getRoute=function(path){
var url=wpcf7.apiSettings.root;
url=url.replace(wpcf7.apiSettings.namespace,
wpcf7.apiSettings.namespace + path);
return url;
};})(jQuery);
(function (){
if(typeof window.CustomEvent==="function") return false;
function CustomEvent(event, params){
params=params||{ bubbles: false, cancelable: false, detail: undefined };
var evt=document.createEvent('CustomEvent');
evt.initCustomEvent(event,
params.bubbles, params.cancelable, params.detail);
return evt;
}
CustomEvent.prototype=window.Event.prototype;
window.CustomEvent=CustomEvent;
})();
if(jQuery.browser.msie&&jQuery.browser.version<=6){jQuery('<div class="msie-box"><a href="http://browsehappy.com/" title="Click here to update" target="_blank">  Your browser is no longer supported. Click here to update...</a> </div>').appendTo("#container")}jQuery(document).ready(function(a){a("a[href=#scroll-top]").click(function(){a("html, body").animate({scrollTop:0},"slow");return false})});(function(b){function a(d){this.input=d;if(d.attr("type")=="password"){this.handlePassword()}b(d[0].form).submit(function(){if(d.hasClass("placeholder")&&d[0].value==d.attr("placeholder")){d[0].value=""}})}a.prototype={show:function(f){if(this.input[0].value===""||(f&&this.valueIsPlaceholder())){if(this.isPassword){try{this.input[0].setAttribute("type","text")}catch(d){this.input.before(this.fakePassword.show()).hide()}}this.input.addClass("placeholder");this.input[0].value=this.input.attr("placeholder")}},hide:function(){if(this.valueIsPlaceholder()&&this.input.hasClass("placeholder")){this.input.removeClass("placeholder");this.input[0].value="";if(this.isPassword){try{this.input[0].setAttribute("type","password")}catch(d){}this.input.show();this.input[0].focus()}}},valueIsPlaceholder:function(){return this.input[0].value==this.input.attr("placeholder")},handlePassword:function(){var d=this.input;d.attr("realType","password");this.isPassword=true;if(b.browser.msie&&d[0].outerHTML){var e=b(d[0].outerHTML.replace(/type=(['"])?password\1/gi,"type=$1text$1"));this.fakePassword=e.val(d.attr("placeholder")).addClass("placeholder").focus(function(){d.trigger("focus");b(this).hide()});b(d[0].form).submit(function(){e.remove();d.show()})}}};var c=!!("placeholder" in document.createElement("input"));b.fn.placeholder=function(){return c?this:this.each(function(){var d=b(this);var e=new a(d);e.show(true);d.focus(function(){e.hide()});d.blur(function(){e.show(false)});if(b.browser.msie){b(window).load(function(){if(d.val()){d.removeClass("placeholder")}e.show(true)});d.focus(function(){if(this.value==""){var f=this.createTextRange();f.collapse(true);f.moveStart("character",0);f.select()}})}})}})(jQuery);if(jQuery.browser.msie&&jQuery.browser.version<=9){jQuery(document).ready(function(a){a.each(a("img"),function(){a(this).removeAttr("width").removeAttr("height")})});
}(function(a){a.fn.fitVids=function(b){var c={customSelector:null};var e=document.createElement("div"),d=document.getElementsByTagName("base")[0]||document.getElementsByTagName("script")[0];e.className="fit-vids-style";e.innerHTML="&shy;<style>               .fluid-width-video-wrapper {                 width: 100%;                              position: relative;                       padding: 0;                            }                                                                                   .fluid-width-video-wrapper iframe,        .fluid-width-video-wrapper object,        .fluid-width-video-wrapper embed {           position: absolute;                       top: 0;                                   left: 0;                                  width: 100%;                              height: 100%;                          }                                       </style>";d.parentNode.insertBefore(e,d);if(b){a.extend(c,b)}return this.each(function(){var f=["iframe[src^='http://player.vimeo.com']","iframe[src^='http://www.youtube.com']","iframe[src^='https://www.youtube.com']","iframe[src^='http://www.kickstarter.com']","object","embed"];if(c.customSelector){f.push(c.customSelector)}var g=a(this).find(f.join(","));g.each(function(){var k=a(this);if(this.tagName.toLowerCase()=="embed"&&k.parent("object").length||k.parent(".fluid-width-video-wrapper").length){return}var h=this.tagName.toLowerCase()=="object"?k.attr("height"):k.height(),i=h/k.width();if(!k.attr("id")){var j="fitvid"+Math.floor(Math.random()*999999);k.attr("id",j)}k.wrap('<div class="fluid-width-video-wrapper"></div>').parent(".fluid-width-video-wrapper").css("padding-top",(i*100)+"%");k.removeAttr("height").removeAttr("width")})})}})(jQuery);
window.matchMedia=window.matchMedia||(function(e,f){var c,a=e.documentElement,b=a.firstElementChild||a.firstChild,d=e.createElement("body"),g=e.createElement("div");g.id="mq-test-1";g.style.cssText="position:absolute;top:-100em";d.style.background="none";d.appendChild(g);return function(h){g.innerHTML='&shy;<style media="'+h+'"> #mq-test-1 { width: 42px; }</style>';a.insertBefore(d,b);c=g.offsetWidth==42;a.removeChild(d);return{matches:c,media:h}}})(document);
(function(e){e.respond={};respond.update=function(){};respond.mediaQueriesSupported=e.matchMedia&&e.matchMedia("only all").matches;if(respond.mediaQueriesSupported){return}var w=e.document,s=w.documentElement,i=[],k=[],q=[],o={},h=30,f=w.getElementsByTagName("head")[0]||s,g=w.getElementsByTagName("base")[0],b=f.getElementsByTagName("link"),d=[],a=function(){var D=b,y=D.length,B=0,A,z,C,x;for(;B<y;B++){A=D[B],z=A.href,C=A.media,x=A.rel&&A.rel.toLowerCase()==="stylesheet";if(!!z&&x&&!o[z]){if(A.styleSheet&&A.styleSheet.rawCssText){m(A.styleSheet.rawCssText,z,C);o[z]=true}else{if((!/^([a-zA-Z:]*\/\/)/.test(z)&&!g)||z.replace(RegExp.$1,"").split("/")[0]===e.location.host){d.push({href:z,media:C})}}}}u()},u=function(){if(d.length){var x=d.shift();n(x.href,function(y){m(y,x.href,x.media);o[x.href]=true;u()})}},m=function(I,x,z){var G=I.match(/@media[^\{]+\{([^\{\}]*\{[^\}\{]*\})+/gi),J=G&&G.length||0,x=x.substring(0,x.lastIndexOf("/")),y=function(K){return K.replace(/(url\()['"]?([^\/\)'"][^:\)'"]+)['"]?(\))/g,"$1"+x+"$2$3")},A=!J&&z,D=0,C,E,F,B,H;if(x.length){x+="/"}if(A){J=1}for(;D<J;D++){C=0;if(A){E=z;k.push(y(I))}else{E=G[D].match(/@media *([^\{]+)\{([\S\s]+?)$/)&&RegExp.$1;k.push(RegExp.$2&&y(RegExp.$2))}B=E.split(",");H=B.length;for(;C<H;C++){F=B[C];i.push({media:F.split("(")[0].match(/(only\s+)?([a-zA-Z]+)\s?/)&&RegExp.$2||"all",rules:k.length-1,hasquery:F.indexOf("(")>-1,minw:F.match(/\(min\-width:[\s]*([\s]*[0-9\.]+)(px|em)[\s]*\)/)&&parseFloat(RegExp.$1)+(RegExp.$2||""),maxw:F.match(/\(max\-width:[\s]*([\s]*[0-9\.]+)(px|em)[\s]*\)/)&&parseFloat(RegExp.$1)+(RegExp.$2||"")})}}j()},l,r,v=function(){var z,A=w.createElement("div"),x=w.body,y=false;A.style.cssText="position:absolute;font-size:1em;width:1em";if(!x){x=y=w.createElement("body");x.style.background="none"}x.appendChild(A);s.insertBefore(x,s.firstChild);z=A.offsetWidth;if(y){s.removeChild(x)}else{x.removeChild(A)}z=p=parseFloat(z);return z},p,j=function(I){var x="clientWidth",B=s[x],H=w.compatMode==="CSS1Compat"&&B||w.body[x]||B,D={},G=b[b.length-1],z=(new Date()).getTime();if(I&&l&&z-l<h){clearTimeout(r);r=setTimeout(j,h);return}else{l=z}for(var E in i){var K=i[E],C=K.minw,J=K.maxw,A=C===null,L=J===null,y="em";if(!!C){C=parseFloat(C)*(C.indexOf(y)>-1?(p||v()):1)}if(!!J){J=parseFloat(J)*(J.indexOf(y)>-1?(p||v()):1)}if(!K.hasquery||(!A||!L)&&(A||H>=C)&&(L||H<=J)){if(!D[K.media]){D[K.media]=[]}D[K.media].push(k[K.rules])}}for(var E in q){if(q[E]&&q[E].parentNode===f){f.removeChild(q[E])}}for(var E in D){var M=w.createElement("style"),F=D[E].join("\n");M.type="text/css";M.media=E;f.insertBefore(M,G.nextSibling);if(M.styleSheet){M.styleSheet.cssText=F}else{M.appendChild(w.createTextNode(F))}q.push(M)}},n=function(x,z){var y=c();if(!y){return}y.open("GET",x,true);y.onreadystatechange=function(){if(y.readyState!=4||y.status!=200&&y.status!=304){return}z(y.responseText)};if(y.readyState==4){return}y.send(null)},c=(function(){var x=false;try{x=new XMLHttpRequest()}catch(y){x=new ActiveXObject("Microsoft.XMLHTTP")}return function(){return x}})();a();respond.update=a;function t(){j(true)}if(e.addEventListener){e.addEventListener("resize",t,false)}else{if(e.attachEvent){e.attachEvent("onresize",t)}}})(this);
jQuery(function(){jQuery('input[placeholder], textarea[placeholder]').placeholder();});jQuery(document).ready(function(){jQuery("#wrapper").fitVids();});
(function(a,b,c){function Z(c,d,e){var g=b.createElement(c);return d&&(g.id=f+d),e&&(g.style.cssText=e),a(g)}function $(a){var b=y.length,c=(Q+a)%b;return c<0?b+c:c}function _(a,b){return Math.round((/%/.test(a)?(b==="x"?z.width():z.height())/100:1)*parseInt(a,10))}function ba(a){return K.photo||/\.(gif|png|jpe?g|bmp|ico)((#|\?).*)?$/i.test(a)}function bb(){var b;K=a.extend({},a.data(P,e));for(b in K)a.isFunction(K[b])&&b.slice(0,2)!=="on"&&(K[b]=K[b].call(P));K.rel=K.rel||P.rel||"nofollow",K.href=K.href||a(P).attr("href"),K.title=K.title||P.title,typeof K.href=="string"&&(K.href=a.trim(K.href))}function bc(b,c){a.event.trigger(b),c&&c.call(P)}function bd(){var a,b=f+"Slideshow_",c="click."+f,d,e,g;K.slideshow&&y[1]?(d=function(){F.text(K.slideshowStop).unbind(c).bind(j,function(){if(K.loop||y[Q+1])a=setTimeout(W.next,K.slideshowSpeed)}).bind(i,function(){clearTimeout(a)}).one(c+" "+k,e),r.removeClass(b+"off").addClass(b+"on"),a=setTimeout(W.next,K.slideshowSpeed)},e=function(){clearTimeout(a),F.text(K.slideshowStart).unbind([j,i,k,c].join(" ")).one(c,function(){W.next(),d()}),r.removeClass(b+"on").addClass(b+"off")},K.slideshowAuto?d():e()):r.removeClass(b+"off "+b+"on")}function be(b){U||(P=b,bb(),y=a(P),Q=0,K.rel!=="nofollow"&&(y=a("."+g).filter(function(){var b=a.data(this,e).rel||this.rel;return b===K.rel}),Q=y.index(P),Q===-1&&(y=y.add(P),Q=y.length-1)),S||(S=T=!0,r.show(),K.returnFocus&&a(P).blur().one(l,function(){a(this).focus()}),q.css({opacity:+K.opacity,cursor:K.overlayClose?"pointer":"auto"}).show(),K.w=_(K.initialWidth,"x"),K.h=_(K.initialHeight,"y"),W.position(),o&&z.bind("resize."+p+" scroll."+p,function(){q.css({width:z.width(),height:z.height(),top:z.scrollTop(),left:z.scrollLeft()})}).trigger("resize."+p),bc(h,K.onOpen),J.add(D).hide(),I.html(K.close).show()),W.load(!0))}function bf(){!r&&b.body&&(Y=!1,z=a(c),r=Z(X).attr({id:e,"class":n?f+(o?"IE6":"IE"):""}).hide(),q=Z(X,"Overlay",o?"position:absolute":"").hide(),s=Z(X,"Wrapper"),t=Z(X,"Content").append(A=Z(X,"LoadedContent","width:0; height:0; overflow:hidden"),C=Z(X,"LoadingOverlay").add(Z(X,"LoadingGraphic")),D=Z(X,"Title"),E=Z(X,"Current"),G=Z(X,"Next"),H=Z(X,"Previous"),F=Z(X,"Slideshow").bind(h,bd),I=Z(X,"Close")),s.append(Z(X).append(Z(X,"TopLeft"),u=Z(X,"TopCenter"),Z(X,"TopRight")),Z(X,!1,"clear:left").append(v=Z(X,"MiddleLeft"),t,w=Z(X,"MiddleRight")),Z(X,!1,"clear:left").append(Z(X,"BottomLeft"),x=Z(X,"BottomCenter"),Z(X,"BottomRight"))).find("div div").css({"float":"left"}),B=Z(X,!1,"position:absolute; width:9999px; visibility:hidden; display:none"),J=G.add(H).add(E).add(F),a(b.body).append(q,r.append(s,B)))}function bg(){return r?(Y||(Y=!0,L=u.height()+x.height()+t.outerHeight(!0)-t.height(),M=v.width()+w.width()+t.outerWidth(!0)-t.width(),N=A.outerHeight(!0),O=A.outerWidth(!0),r.css({"padding-bottom":L,"padding-right":M}),G.click(function(){W.next()}),H.click(function(){W.prev()}),I.click(function(){W.close()}),q.click(function(){K.overlayClose&&W.close()}),a(b).bind("keydown."+f,function(a){var b=a.keyCode;S&&K.escKey&&b===27&&(a.preventDefault(),W.close()),S&&K.arrowKey&&y[1]&&(b===37?(a.preventDefault(),H.click()):b===39&&(a.preventDefault(),G.click()))}),a("."+g,b).live("click",function(a){a.which>1||a.shiftKey||a.altKey||a.metaKey||(a.preventDefault(),be(this))})),!0):!1}var d={transition:"elastic",speed:300,width:!1,initialWidth:"600",innerWidth:!1,maxWidth:!1,height:!1,initialHeight:"450",innerHeight:!1,maxHeight:!1,scalePhotos:!0,scrolling:!0,inline:!1,html:!1,iframe:!1,fastIframe:!0,photo:!1,href:!1,title:!1,rel:!1,opacity:.9,preloading:!0,current:"image {current} of {total}",previous:"previous",next:"next",close:"close",open:!1,returnFocus:!0,reposition:!0,loop:!0,slideshow:!1,slideshowAuto:!0,slideshowSpeed:2500,slideshowStart:"start slideshow",slideshowStop:"stop slideshow",onOpen:!1,onLoad:!1,onComplete:!1,onCleanup:!1,onClosed:!1,overlayClose:!0,escKey:!0,arrowKey:!0,top:!1,bottom:!1,left:!1,right:!1,fixed:!1,data:undefined},e="colorbox",f="cbox",g=f+"Element",h=f+"_open",i=f+"_load",j=f+"_complete",k=f+"_cleanup",l=f+"_closed",m=f+"_purge",n=!a.support.opacity&&!a.support.style,o=n&&!c.XMLHttpRequest,p=f+"_IE6",q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X="div",Y;if(a.colorbox)return;a(bf),W=a.fn[e]=a[e]=function(b,c){var f=this;b=b||{},bf();if(bg()){if(!f[0]){if(f.selector)return f;f=a("<a/>"),b.open=!0}c&&(b.onComplete=c),f.each(function(){a.data(this,e,a.extend({},a.data(this,e)||d,b))}).addClass(g),(a.isFunction(b.open)&&b.open.call(f)||b.open)&&be(f[0])}return f},W.position=function(a,b){function i(a){u[0].style.width=x[0].style.width=t[0].style.width=a.style.width,t[0].style.height=v[0].style.height=w[0].style.height=a.style.height}var c=0,d=0,e=r.offset(),g=z.scrollTop(),h=z.scrollLeft();z.unbind("resize."+f),r.css({top:-9e4,left:-9e4}),K.fixed&&!o?(e.top-=g,e.left-=h,r.css({position:"fixed"})):(c=g,d=h,r.css({position:"absolute"})),K.right!==!1?d+=Math.max(z.width()-K.w-O-M-_(K.right,"x"),0):K.left!==!1?d+=_(K.left,"x"):d+=Math.round(Math.max(z.width()-K.w-O-M,0)/2),K.bottom!==!1?c+=Math.max(z.height()-K.h-N-L-_(K.bottom,"y"),0):K.top!==!1?c+=_(K.top,"y"):c+=Math.round(Math.max(z.height()-K.h-N-L,0)/2),r.css({top:e.top,left:e.left}),a=r.width()===K.w+O&&r.height()===K.h+N?0:a||0,s[0].style.width=s[0].style.height="9999px",r.dequeue().animate({width:K.w+O,height:K.h+N,top:c,left:d},{duration:a,complete:function(){i(this),T=!1,s[0].style.width=K.w+O+M+"px",s[0].style.height=K.h+N+L+"px",K.reposition&&setTimeout(function(){z.bind("resize."+f,W.position)},1),b&&b()},step:function(){i(this)}})},W.resize=function(a){S&&(a=a||{},a.width&&(K.w=_(a.width,"x")-O-M),a.innerWidth&&(K.w=_(a.innerWidth,"x")),A.css({width:K.w}),a.height&&(K.h=_(a.height,"y")-N-L),a.innerHeight&&(K.h=_(a.innerHeight,"y")),!a.innerHeight&&!a.height&&(A.css({height:"auto"}),K.h=A.height()),A.css({height:K.h}),W.position(K.transition==="none"?0:K.speed))},W.prep=function(b){function g(){return K.w=K.w||A.width(),K.w=K.mw&&K.mw<K.w?K.mw:K.w,K.w}function h(){return K.h=K.h||A.height(),K.h=K.mh&&K.mh<K.h?K.mh:K.h,K.h}if(!S)return;var c,d=K.transition==="none"?0:K.speed;A.remove(),A=Z(X,"LoadedContent").append(b),A.hide().appendTo(B.show()).css({width:g(),overflow:K.scrolling?"auto":"hidden"}).css({height:h()}).prependTo(t),B.hide(),a(R).css({"float":"none"}),o&&a("select").not(r.find("select")).filter(function(){return this.style.visibility!=="hidden"}).css({visibility:"hidden"}).one(k,function(){this.style.visibility="inherit"}),c=function(){function q(){n&&r[0].style.removeAttribute("filter")}var b,c,g=y.length,h,i="frameBorder",k="allowTransparency",l,o,p;if(!S)return;l=function(){clearTimeout(V),C.hide(),bc(j,K.onComplete)},n&&R&&A.fadeIn(100),D.html(K.title).add(A).show();if(g>1){typeof K.current=="string"&&E.html(K.current.replace("{current}",Q+1).replace("{total}",g)).show(),G[K.loop||Q<g-1?"show":"hide"]().html(K.next),H[K.loop||Q?"show":"hide"]().html(K.previous),K.slideshow&&F.show();if(K.preloading){b=[$(-1),$(1)];while(c=y[b.pop()])o=a.data(c,e).href||c.href,a.isFunction(o)&&(o=o.call(c)),ba(o)&&(p=new Image,p.src=o)}}else J.hide();K.iframe?(h=Z("iframe")[0],i in h&&(h[i]=0),k in h&&(h[k]="true"),h.name=f+ +(new Date),K.fastIframe?l():a(h).one("load",l),h.src=K.href,K.scrolling||(h.scrolling="no"),a(h).addClass(f+"Iframe").appendTo(A).one(m,function(){h.src="//about:blank"})):l(),K.transition==="fade"?r.fadeTo(d,1,q):q()},K.transition==="fade"?r.fadeTo(d,0,function(){W.position(0,c)}):W.position(d,c)},W.load=function(b){var c,d,e=W.prep;T=!0,R=!1,P=y[Q],b||bb(),bc(m),bc(i,K.onLoad),K.h=K.height?_(K.height,"y")-N-L:K.innerHeight&&_(K.innerHeight,"y"),K.w=K.width?_(K.width,"x")-O-M:K.innerWidth&&_(K.innerWidth,"x"),K.mw=K.w,K.mh=K.h,K.maxWidth&&(K.mw=_(K.maxWidth,"x")-O-M,K.mw=K.w&&K.w<K.mw?K.w:K.mw),K.maxHeight&&(K.mh=_(K.maxHeight,"y")-N-L,K.mh=K.h&&K.h<K.mh?K.h:K.mh),c=K.href,V=setTimeout(function(){C.show()},100),K.inline?(Z(X).hide().insertBefore(a(c)[0]).one(m,function(){a(this).replaceWith(A.children())}),e(a(c))):K.iframe?e(" "):K.html?e(K.html):ba(c)?(a(R=new Image).addClass(f+"Photo").error(function(){K.title=!1,e(Z(X,"Error").text("This image could not be loaded"))}).load(function(){var a;R.onload=null,K.scalePhotos&&(d=function(){R.height-=R.height*a,R.width-=R.width*a},K.mw&&R.width>K.mw&&(a=(R.width-K.mw)/R.width,d()),K.mh&&R.height>K.mh&&(a=(R.height-K.mh)/R.height,d())),K.h&&(R.style.marginTop=Math.max(K.h-R.height,0)/2+"px"),y[1]&&(K.loop||y[Q+1])&&(R.style.cursor="pointer",R.onclick=function(){W.next()}),n&&(R.style.msInterpolationMode="bicubic"),setTimeout(function(){e(R)},1)}),setTimeout(function(){R.src=c},1)):c&&B.load(c,K.data,function(b,c,d){e(c==="error"?Z(X,"Error").text("Request unsuccessful: "+d.statusText):a(this).contents())})},W.next=function(){!T&&y[1]&&(K.loop||y[Q+1])&&(Q=$(1),W.load())},W.prev=function(){!T&&y[1]&&(K.loop||Q)&&(Q=$(-1),W.load())},W.close=function(){S&&!U&&(U=!0,S=!1,bc(k,K.onCleanup),z.unbind("."+f+" ."+p),q.fadeTo(200,0),r.stop().fadeTo(300,0,function(){r.add(q).css({opacity:1,cursor:"auto"}).hide(),bc(m),A.remove(),setTimeout(function(){U=!1,bc(l,K.onClosed)},1)}))},W.remove=function(){a([]).add(r).add(q).remove(),r=null,a("."+g).removeData(e).removeClass(g).die()},W.element=function(){return a(P)},W.settings=d})(jQuery,document,this);
!function(d,l){"use strict";var e=!1,n=!1;if(l.querySelector)if(d.addEventListener)e=!0;if(d.wp=d.wp||{},!d.wp.receiveEmbedMessage)if(d.wp.receiveEmbedMessage=function(e){var t=e.data;if(t)if(t.secret||t.message||t.value)if(!/[^a-zA-Z0-9]/.test(t.secret)){for(var r,i,a,s=l.querySelectorAll('iframe[data-secret="'+t.secret+'"]'),n=l.querySelectorAll('blockquote[data-secret="'+t.secret+'"]'),o=new RegExp("^https?:$","i"),c=0;c<n.length;c++)n[c].style.display="none";for(c=0;c<s.length;c++)if(r=s[c],e.source===r.contentWindow){if(r.removeAttribute("style"),"height"===t.message){if(1e3<(a=parseInt(t.value,10)))a=1e3;else if(~~a<200)a=200;r.height=a}if("link"===t.message)if(i=l.createElement("a"),a=l.createElement("a"),i.href=r.getAttribute("src"),a.href=t.value,o.test(a.protocol))if(a.host===i.host)if(l.activeElement===r)d.top.location.href=t.value}}},e)d.addEventListener("message",d.wp.receiveEmbedMessage,!1),l.addEventListener("DOMContentLoaded",t,!1),d.addEventListener("load",t,!1);function t(){if(!n){n=!0;for(var e,t,r=-1!==navigator.appVersion.indexOf("MSIE 10"),i=!!navigator.userAgent.match(/Trident.*rv:11\./),a=l.querySelectorAll("iframe.wp-embedded-content"),s=0;s<a.length;s++){if(!(e=a[s]).getAttribute("data-secret"))t=Math.random().toString(36).substr(2,10),e.src+="#?secret="+t,e.setAttribute("data-secret",t);if(r||i)(t=e.cloneNode(!0)).removeAttribute("security"),e.parentNode.replaceChild(t,e)}}}}(window,document);
function wpseo_show_map(a,b,c,d,e,f,g,h,i,j,k){var l=new google.maps.LatLngBounds,m=new google.maps.LatLng(c,d),n=480;markers[b]=[];var o={zoom:e,minZoom:1,mapTypeControl:!0,zoomControl:g,streetViewControl:!0,mapTypeId:google.maps.MapTypeId[f.toUpperCase()],scrollwheel:g&&window.innerWidth>n};if(checkForTouch()?o.gestureHandling=h?"auto":"none":o.draggable=h,-1==e){for(var p=0;p<a.length;p++){var q=new google.maps.LatLng(a[p].lat,a[p].long);l.extend(q)}m=l.getCenter()}o.center=m;var r=new google.maps.Map(document.getElementById("map_canvas"+(0!=b?"_"+b:"")),o);-1==e&&r.fitBounds(l);for(var s=new google.maps.InfoWindow({content:t}),p=0;p<a.length;p++){var t=getInfoBubbleText(a[p].name,a[p].address,a[p].url,a[p].self_url),q=new google.maps.LatLng(a[p].lat,a[p].long),u=a[p].custom_marker,v=a[p].categories;markers[b][p]=new google.maps.Marker({position:q,center:m,map:r,map_id:b,html:t,draggable:Boolean(j),icon:void 0!==u&&u||"",categories:void 0!==v&&v||""})}for(var p=0;p<markers[b].length;p++){var w=markers[b][p];google.maps.event.addListener(w,"click",function(){s.setContent(this.html),s.open(r,this)}),google.maps.event.addListener(s,"closeclick",function(){r.setCenter(this.getPosition())}),google.maps.event.addListener(w,"dragend",function(a){document.getElementById("wpseo_coordinates_lat")&&document.getElementById("wpseo_coordinates_long")&&(document.getElementById("wpseo_coordinates_lat").value=a.latLng.lat(),document.getElementById("wpseo_coordinates_long").value=a.latLng.lng()),document.getElementById("location_coords_lat")&&document.getElementById("location_coords_long")&&(document.getElementById("location_coords_lat").value=a.latLng.lat(),document.getElementById("location_coords_long").value=a.latLng.lng())})}return k&&new MarkerClusterer(r,markers[b],{imagePath:wpseo_local_data.marker_cluster_image_path}),1==markers[b].length&&i&&(s.setContent(markers[b][0].html),s.open(r,w)),r}function checkForTouch(){return!!(navigator.userAgent.match(/Android/i)||navigator.userAgent.match(/webOS/i)||navigator.userAgent.match(/iPhone/i)||navigator.userAgent.match(/iPad/i)||navigator.userAgent.match(/iPod/i)||navigator.userAgent.match(/BlackBerry/i)||navigator.userAgent.match(/Windows Phone/i))}function wpseo_get_directions(a,b,c,d){var e="";return d&&b.length>=1&&(e=new google.maps.DirectionsRenderer,e.setMap(a),e.setPanel(document.getElementById("directions"+(0!=c?"_"+c:"")))),e}function getInfoBubbleText(a,b,c,d){var e='<div class="wpseo-info-window-wrapper">',f=!1;return void 0!=d&&""!=wpseo_local_data.has_multiple_locations&&d!=window.location.href&&(f=!0),f&&(e+='<a href="'+d+'">'),e+="<strong>"+a+"</strong>",f&&(e+="</a>"),e+="<br>",e+=b,e+="</div>"}function wpseo_calculate_route(a,b,c,d,e){null!=document.getElementById("wpseo-sl-coords-lat")&&(c=document.getElementById("wpseo-sl-coords-lat").value),null!=document.getElementById("wpseo-sl-coords-long")&&(d=document.getElementById("wpseo-sl-coords-long").value);var f=document.getElementById("origin"+(0!=e?"_"+e:"")).value+" "+wpseo_local_data.default_country,g=google.maps.UnitSystem.METRIC;"IMPERIAL"==wpseo_local_data.unit_system&&(g=google.maps.UnitSystem.IMPERIAL);for(var h=0;h<markers.length;h++)markers[h].setMap(null);if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){var i="https://maps.google.com/maps?saddr="+escape(f)+"&daddr="+c+","+d;return window.open(i,"_blank"),!1}var j=new google.maps.LatLng(c,d),k={origin:f,destination:j,provideRouteAlternatives:!0,optimizeWaypoints:!0,travelMode:google.maps.DirectionsTravelMode.DRIVING,unitSystem:g};(new google.maps.DirectionsService).route(k,function(a,c){if(c==google.maps.DirectionsStatus.OK)b.setDirections(a);else if(c==google.maps.DirectionsStatus.ZERO_RESULTS){var d=document.getElementById("wpseo-noroute");d.setAttribute("style","clear: both; display: block;")}})}function wpseo_sl_show_route(a,b,c){$=jQuery,$(".wpseo-sl-coords").remove();var d='<input type="hidden" class="wpseo-sl-coords" id="wpseo-sl-coords-lat" value="'+b+'">';d+='<input type="hidden" class="wpseo-sl-coords" id="wpseo-sl-coords-long" value="'+c+'">',$("#wpseo-directions-form").append(d).submit(),$("#wpseo-directions-wrapper").slideUp(function(){$(this).insertAfter($(a).parents(".wpseo-result")).slideDown()})}function wpseo_detect_location(a,b){var c=document.getElementById(b);if(null==c&&(c=document.getElementById("origin")),navigator.geolocation&&null!=c){var d=a.target||a.srcElement,e=d.getAttribute("src"),f=d.getAttribute("alt"),g=d.getAttribute("data-loading-text");d.setAttribute("src",wpseo_local_data.adminurl+"images/loading.gif"),d.setAttribute("alt",g),navigator.geolocation.getCurrentPosition(function(a){var b=new google.maps.Geocoder,g={lat:parseFloat(a.coords.latitude),lng:parseFloat(a.coords.longitude)};b.geocode({location:g},function(a,b){b===google.maps.GeocoderStatus.OK&&a.length>0&&""==c.value&&(c.value=a[0].formatted_address),d.setAttribute("src",e),d.setAttribute("alt",f)})},function(a){var b="[wpseo] Error detecting location: ";switch(a.code){case a.TIMEOUT:b+="Timeout";break;case a.POSITION_UNAVAILABLE:b+="Position unavailable";break;case a.PERMISSION_DENIED:b+="Permission denied";break;case a.UNKNOWN_ERROR:b+="Unknown error"}"undefined"!=typeof console&&console.log(b),d.setAttribute("src",e),d.setAttribute("alt",f)})}}function filterMarkers(a,b){for(i=0;i<markers[b].length;i++)marker=markers[b][i],marker.categories.hasOwnProperty(a)||0===a.length?marker.setVisible(!0):marker.setVisible(!1)}
function MarkerClusterer(a,b,c){this.extend(MarkerClusterer,google.maps.OverlayView),this.map_=a,this.markers_=[],this.clusters_=[],this.sizes=[53,56,66,78,90],this.styles_=[],this.ready_=!1;var d=c||{};this.gridSize_=d.gridSize||60,this.minClusterSize_=d.minimumClusterSize||2,this.maxZoom_=d.maxZoom||null,this.styles_=d.styles||[],this.imagePath_=d.imagePath||this.MARKER_CLUSTER_IMAGE_PATH_,this.imageExtension_=d.imageExtension||this.MARKER_CLUSTER_IMAGE_EXTENSION_,this.zoomOnClick_=!0,void 0!=d.zoomOnClick&&(this.zoomOnClick_=d.zoomOnClick),this.averageCenter_=!1,void 0!=d.averageCenter&&(this.averageCenter_=d.averageCenter),this.setupStyles_(),this.setMap(a),this.prevZoom_=this.map_.getZoom();var e=this;google.maps.event.addListener(this.map_,"zoom_changed",function(){var a=e.map_.getZoom();e.prevZoom_!=a&&(e.prevZoom_=a,e.resetViewport())}),google.maps.event.addListener(this.map_,"idle",function(){e.redraw()}),b&&b.length&&this.addMarkers(b,!1)}function Cluster(a){this.markerClusterer_=a,this.map_=a.getMap(),this.gridSize_=a.getGridSize(),this.minClusterSize_=a.getMinClusterSize(),this.averageCenter_=a.isAverageCenter(),this.center_=null,this.markers_=[],this.bounds_=null,this.clusterIcon_=new ClusterIcon(this,a.getStyles(),a.getGridSize())}function ClusterIcon(a,b,c){a.getMarkerClusterer().extend(ClusterIcon,google.maps.OverlayView),this.styles_=b,this.padding_=c||0,this.cluster_=a,this.center_=null,this.map_=a.getMap(),this.div_=null,this.sums_=null,this.visible_=!1,this.setMap(this.map_)}for(var wpseo_directions=[],wpseo_maps=[],markers=new Object,wpseo_current_location_buttons=document.getElementsByClassName("wpseo_use_current_location"),i=0;i<wpseo_current_location_buttons.length;i++)wpseo_current_location_buttons[i].addEventListener("click",function(a){wpseo_detect_location(a,this.dataset.target)},!1);MarkerClusterer.prototype.MARKER_CLUSTER_IMAGE_PATH_="../images/m",MarkerClusterer.prototype.MARKER_CLUSTER_IMAGE_EXTENSION_="png",MarkerClusterer.prototype.extend=function(a,b){return function(a){for(var b in a.prototype)this.prototype[b]=a.prototype[b];return this}.apply(a,[b])},MarkerClusterer.prototype.onAdd=function(){this.setReady_(!0)},MarkerClusterer.prototype.draw=function(){},MarkerClusterer.prototype.setupStyles_=function(){if(!this.styles_.length)for(var a,b=0;a=this.sizes[b];b++)this.styles_.push({url:this.imagePath_+(b+1)+"."+this.imageExtension_,height:a,width:a})},MarkerClusterer.prototype.fitMapToMarkers=function(){for(var a,b=this.getMarkers(),c=new google.maps.LatLngBounds,d=0;a=b[d];d++)c.extend(a.getPosition());this.map_.fitBounds(c)},MarkerClusterer.prototype.setStyles=function(a){this.styles_=a},MarkerClusterer.prototype.getStyles=function(){return this.styles_},MarkerClusterer.prototype.isZoomOnClick=function(){return this.zoomOnClick_},MarkerClusterer.prototype.isAverageCenter=function(){return this.averageCenter_},MarkerClusterer.prototype.getMarkers=function(){return this.markers_},MarkerClusterer.prototype.getTotalMarkers=function(){return this.markers_.length},MarkerClusterer.prototype.setMaxZoom=function(a){this.maxZoom_=a},MarkerClusterer.prototype.getMaxZoom=function(){return this.maxZoom_},MarkerClusterer.prototype.calculator_=function(a,b){for(var c=0,d=a.length,e=d;0!==e;)e=parseInt(e/10,10),c++;return c=Math.min(c,b),{text:d,index:c}},MarkerClusterer.prototype.setCalculator=function(a){this.calculator_=a},MarkerClusterer.prototype.getCalculator=function(){return this.calculator_},MarkerClusterer.prototype.addMarkers=function(a,b){for(var c,d=0;c=a[d];d++)this.pushMarkerTo_(c);b||this.redraw()},MarkerClusterer.prototype.pushMarkerTo_=function(a){if(a.isAdded=!1,a.draggable){var b=this;google.maps.event.addListener(a,"dragend",function(){a.isAdded=!1,b.repaint()})}this.markers_.push(a)},MarkerClusterer.prototype.addMarker=function(a,b){this.pushMarkerTo_(a),b||this.redraw()},MarkerClusterer.prototype.removeMarker_=function(a){var b=-1;if(this.markers_.indexOf)b=this.markers_.indexOf(a);else for(var c,d=0;c=this.markers_[d];d++)if(c==a){b=d;break}return-1!=b&&(a.setMap(null),this.markers_.splice(b,1),!0)},MarkerClusterer.prototype.removeMarker=function(a,b){var c=this.removeMarker_(a);return!(b||!c)&&(this.resetViewport(),this.redraw(),!0)},MarkerClusterer.prototype.removeMarkers=function(a,b){for(var c,d=!1,e=0;c=a[e];e++){var f=this.removeMarker_(c);d=d||f}if(!b&&d)return this.resetViewport(),this.redraw(),!0},MarkerClusterer.prototype.setReady_=function(a){this.ready_||(this.ready_=a,this.createClusters_())},MarkerClusterer.prototype.getTotalClusters=function(){return this.clusters_.length},MarkerClusterer.prototype.getMap=function(){return this.map_},MarkerClusterer.prototype.setMap=function(a){this.map_=a},MarkerClusterer.prototype.getGridSize=function(){return this.gridSize_},MarkerClusterer.prototype.setGridSize=function(a){this.gridSize_=a},MarkerClusterer.prototype.getMinClusterSize=function(){return this.minClusterSize_},MarkerClusterer.prototype.setMinClusterSize=function(a){this.minClusterSize_=a},MarkerClusterer.prototype.getExtendedBounds=function(a){var b=this.getProjection(),c=new google.maps.LatLng(a.getNorthEast().lat(),a.getNorthEast().lng()),d=new google.maps.LatLng(a.getSouthWest().lat(),a.getSouthWest().lng()),e=b.fromLatLngToDivPixel(c);e.x+=this.gridSize_,e.y-=this.gridSize_;var f=b.fromLatLngToDivPixel(d);f.x-=this.gridSize_,f.y+=this.gridSize_;var g=b.fromDivPixelToLatLng(e),h=b.fromDivPixelToLatLng(f);return a.extend(g),a.extend(h),a},MarkerClusterer.prototype.isMarkerInBounds_=function(a,b){return b.contains(a.getPosition())},MarkerClusterer.prototype.clearMarkers=function(){this.resetViewport(!0),this.markers_=[]},MarkerClusterer.prototype.resetViewport=function(a){for(var b,c=0;b=this.clusters_[c];c++)b.remove();for(var d,c=0;d=this.markers_[c];c++)d.isAdded=!1,a&&d.setMap(null);this.clusters_=[]},MarkerClusterer.prototype.repaint=function(){var a=this.clusters_.slice();this.clusters_.length=0,this.resetViewport(),this.redraw(),window.setTimeout(function(){for(var b,c=0;b=a[c];c++)b.remove()},0)},MarkerClusterer.prototype.redraw=function(){this.createClusters_()},MarkerClusterer.prototype.distanceBetweenPoints_=function(a,b){if(!a||!b)return 0;var c=(b.lat()-a.lat())*Math.PI/180,d=(b.lng()-a.lng())*Math.PI/180,e=Math.sin(c/2)*Math.sin(c/2)+Math.cos(a.lat()*Math.PI/180)*Math.cos(b.lat()*Math.PI/180)*Math.sin(d/2)*Math.sin(d/2);return 2*Math.atan2(Math.sqrt(e),Math.sqrt(1-e))*6371},MarkerClusterer.prototype.addToClosestCluster_=function(a){for(var b,c=4e4,d=null,e=(a.getPosition(),0);b=this.clusters_[e];e++){var f=b.getCenter();if(f){var g=this.distanceBetweenPoints_(f,a.getPosition());g<c&&(c=g,d=b)}}if(d&&d.isMarkerInClusterBounds(a))d.addMarker(a);else{var b=new Cluster(this);b.addMarker(a),this.clusters_.push(b)}},MarkerClusterer.prototype.createClusters_=function(){if(this.ready_)for(var a,b=new google.maps.LatLngBounds(this.map_.getBounds().getSouthWest(),this.map_.getBounds().getNorthEast()),c=this.getExtendedBounds(b),d=0;a=this.markers_[d];d++)!a.isAdded&&this.isMarkerInBounds_(a,c)&&this.addToClosestCluster_(a)},Cluster.prototype.isMarkerAlreadyAdded=function(a){if(this.markers_.indexOf)return-1!=this.markers_.indexOf(a);for(var b,c=0;b=this.markers_[c];c++)if(b==a)return!0;return!1},Cluster.prototype.addMarker=function(a){if(this.isMarkerAlreadyAdded(a))return!1;if(this.center_){if(this.averageCenter_){var b=this.markers_.length+1,c=(this.center_.lat()*(b-1)+a.getPosition().lat())/b,d=(this.center_.lng()*(b-1)+a.getPosition().lng())/b;this.center_=new google.maps.LatLng(c,d),this.calculateBounds_()}}else this.center_=a.getPosition(),this.calculateBounds_();a.isAdded=!0,this.markers_.push(a);var e=this.markers_.length;if(e<this.minClusterSize_&&a.getMap()!=this.map_&&a.setMap(this.map_),e==this.minClusterSize_)for(var f=0;f<e;f++)this.markers_[f].setMap(null);return e>=this.minClusterSize_&&a.setMap(null),this.updateIcon(),!0},Cluster.prototype.getMarkerClusterer=function(){return this.markerClusterer_},Cluster.prototype.getBounds=function(){for(var a,b=new google.maps.LatLngBounds(this.center_,this.center_),c=this.getMarkers(),d=0;a=c[d];d++)b.extend(a.getPosition());return b},Cluster.prototype.remove=function(){this.clusterIcon_.remove(),this.markers_.length=0,delete this.markers_},Cluster.prototype.getSize=function(){return this.markers_.length},Cluster.prototype.getMarkers=function(){return this.markers_},Cluster.prototype.getCenter=function(){return this.center_},Cluster.prototype.calculateBounds_=function(){var a=new google.maps.LatLngBounds(this.center_,this.center_);this.bounds_=this.markerClusterer_.getExtendedBounds(a)},Cluster.prototype.isMarkerInClusterBounds=function(a){return this.bounds_.contains(a.getPosition())},Cluster.prototype.getMap=function(){return this.map_},Cluster.prototype.updateIcon=function(){var a=this.map_.getZoom(),b=this.markerClusterer_.getMaxZoom();if(b&&a>b)for(var c,d=0;c=this.markers_[d];d++)c.setMap(this.map_);else{if(this.markers_.length<this.minClusterSize_)return void this.clusterIcon_.hide();var e=this.markerClusterer_.getStyles().length,f=this.markerClusterer_.getCalculator()(this.markers_,e);this.clusterIcon_.setCenter(this.center_),this.clusterIcon_.setSums(f),this.clusterIcon_.show()}},ClusterIcon.prototype.triggerClusterClick=function(a){var b=this.cluster_.getMarkerClusterer();google.maps.event.trigger(b,"clusterclick",this.cluster_,a),b.isZoomOnClick()&&this.map_.fitBounds(this.cluster_.getBounds())},ClusterIcon.prototype.onAdd=function(){if(this.div_=document.createElement("DIV"),this.visible_){var a=this.getPosFromLatLng_(this.center_);this.div_.style.cssText=this.createCss(a),this.div_.innerHTML=this.sums_.text}this.getPanes().overlayMouseTarget.appendChild(this.div_);var b=this,c=!1;google.maps.event.addDomListener(this.div_,"click",function(a){c||b.triggerClusterClick(a)}),google.maps.event.addDomListener(this.div_,"mousedown",function(){c=!1}),google.maps.event.addDomListener(this.div_,"mousemove",function(){c=!0})},ClusterIcon.prototype.getPosFromLatLng_=function(a){var b=this.getProjection().fromLatLngToDivPixel(a);return"object"==typeof this.iconAnchor_&&2===this.iconAnchor_.length?(b.x-=this.iconAnchor_[0],b.y-=this.iconAnchor_[1]):(b.x-=parseInt(this.width_/2,10),b.y-=parseInt(this.height_/2,10)),b},ClusterIcon.prototype.draw=function(){if(this.visible_){var a=this.getPosFromLatLng_(this.center_);this.div_.style.top=a.y+"px",this.div_.style.left=a.x+"px"}},ClusterIcon.prototype.hide=function(){this.div_&&(this.div_.style.display="none"),this.visible_=!1},ClusterIcon.prototype.show=function(){if(this.div_){var a=this.getPosFromLatLng_(this.center_);this.div_.style.cssText=this.createCss(a),this.div_.style.display=""}this.visible_=!0},ClusterIcon.prototype.remove=function(){this.setMap(null)},ClusterIcon.prototype.onRemove=function(){this.div_&&this.div_.parentNode&&(this.hide(),this.div_.parentNode.removeChild(this.div_),this.div_=null)},ClusterIcon.prototype.setSums=function(a){this.sums_=a,this.text_=a.text,this.index_=a.index,this.div_&&(this.div_.innerHTML=a.text),this.useStyle()},ClusterIcon.prototype.useStyle=function(){var a=Math.max(0,this.sums_.index-1);a=Math.min(this.styles_.length-1,a);var b=this.styles_[a];this.url_=b.url,this.height_=b.height,this.width_=b.width,this.textColor_=b.textColor,this.anchor_=b.anchor,this.textSize_=b.textSize,this.backgroundPosition_=b.backgroundPosition,this.iconAnchor_=b.iconAnchor},ClusterIcon.prototype.setCenter=function(a){this.center_=a},ClusterIcon.prototype.createCss=function(a){var b=[];b.push("background-image:url("+this.url_+");");var c=this.backgroundPosition_?this.backgroundPosition_:"0 0";b.push("background-position:"+c+";"),"object"==typeof this.anchor_?("number"==typeof this.anchor_[0]&&this.anchor_[0]>0&&this.anchor_[0]<this.height_?b.push("height:"+(this.height_-this.anchor_[0])+"px; padding-top:"+this.anchor_[0]+"px;"):"number"==typeof this.anchor_[0]&&this.anchor_[0]<0&&-this.anchor_[0]<this.height_?b.push("height:"+this.height_+"px; line-height:"+(this.height_+this.anchor_[0])+"px;"):b.push("height:"+this.height_+"px; line-height:"+this.height_+"px;"),"number"==typeof this.anchor_[1]&&this.anchor_[1]>0&&this.anchor_[1]<this.width_?b.push("width:"+(this.width_-this.anchor_[1])+"px; padding-left:"+this.anchor_[1]+"px;"):b.push("width:"+this.width_+"px; text-align:center;")):b.push("height:"+this.height_+"px; line-height:"+this.height_+"px; width:"+this.width_+"px; text-align:center;");var d=this.textColor_?this.textColor_:"black",e=this.textSize_?this.textSize_:11;return b.push("cursor:pointer; top:"+a.y+"px; left:"+a.x+"px; color:"+d+"; position:absolute; font-size:"+e+"px; font-family:Arial,sans-serif; font-weight:bold"),b.join("")};