import { GAME_CONFIG } from '../config.js';

export class UISystem {
  constructor(){
    this.startScreen=document.querySelector('#start-screen');this.startButton=document.querySelector('#start-button');this.hud=document.querySelector('#hud');this.objective=document.querySelector('#objective');this.pips=[...document.querySelectorAll('#memory-pips i')];this.interaction=document.querySelector('#interaction');this.interactionText=this.interaction.querySelector('span');this.stamina=document.querySelector('#stamina');this.danger=document.querySelector('#danger');this.toastEl=document.querySelector('#toast');this.letter=document.querySelector('#letter-modal');this.ending=document.querySelector('#ending');this.settingsPanel=document.querySelector('#settings-panel');this.quality=document.querySelector('#quality');this.sound=document.querySelector('#sound');this.finishButton=document.querySelector('#finish-button');this.replayButton=document.querySelector('#replay-button');
    document.querySelector('#girl-name').textContent=GAME_CONFIG.girlfriendName;document.querySelector('#apology-text').textContent=GAME_CONFIG.apologyText;document.querySelector('#final-phrase').textContent=GAME_CONFIG.finalPhrase;document.querySelector('#final-photo').src=GAME_CONFIG.photoPath;
    document.querySelector('#settings-toggle').addEventListener('click',()=>this.settingsPanel.classList.toggle('hidden'));
    document.querySelector('#final-photo').addEventListener('error',(e)=>{e.currentTarget.alt='Добавьте вашу фотографию: assets/images/final-photo.jpg'});
  }
  onStart(handler){this.startButton.addEventListener('click',handler)}
  onFinish(handler){this.finishButton.addEventListener('click',handler)}
  onReplay(handler){this.replayButton.addEventListener('click',handler)}
  onQuality(handler){this.quality.addEventListener('change',()=>handler(this.quality.value))}
  onSound(handler){this.sound.addEventListener('change',()=>handler(this.sound.checked))}
  showGame(){this.startScreen.classList.remove('visible');this.hud.classList.remove('hidden')}
  updateQuest(quest){this.objective.textContent=quest.objective;this.pips.forEach((p,i)=>p.classList.toggle('found',i<quest.memories.size))}
  setInteraction(label){this.interaction.classList.toggle('hidden',!label);this.interactionText.textContent=label||''}
  setStamina(value){this.stamina.style.width=`${Math.round(value*100)}%`;this.stamina.style.background=value<.2?'#d86a55':''}
  setDanger(value){this.danger.classList.toggle('hidden',!value)}
  toast(text,duration=2600){this.toastEl.textContent=text;this.toastEl.classList.add('show');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.toastEl.classList.remove('show'),duration)}
  showLetter(){document.exitPointerLock?.();this.letter.classList.add('visible')}
  showEnding(){this.letter.classList.remove('visible');this.ending.classList.add('visible')}
  reset(){this.ending.classList.remove('visible');this.letter.classList.remove('visible');this.startScreen.classList.add('visible');this.hud.classList.add('hidden');this.setDanger(false);this.setInteraction(null)}
}
