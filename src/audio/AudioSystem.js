import { GAME_CONFIG } from '../config.js';

export class AudioSystem {
  constructor(){this.ctx=null;this.master=null;this.enabled=true;this.stepTimer=0;this.chaseGain=null;this.birdTimer=null;this.music=null}
  async start(){
    if(this.ctx){await this.ctx.resume();return}
    this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=this.enabled?.32:0;this.master.connect(this.ctx.destination);
    const seconds=3,buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*seconds,this.ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(.45+.55*Math.sin(i/data.length*Math.PI));
    const wind=this.ctx.createBufferSource();wind.buffer=buffer;wind.loop=true;const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=520;const gain=this.ctx.createGain();gain.gain.value=.12;wind.connect(filter).connect(gain).connect(this.master);wind.start();
    this.birdTimer=setInterval(()=>{if(this.enabled&&Math.random()>.42)this.#chirp()},3200);
    const osc=this.ctx.createOscillator();osc.type='sawtooth';osc.frequency.value=52;this.chaseGain=this.ctx.createGain();this.chaseGain.gain.value=0;osc.connect(this.chaseGain).connect(this.master);osc.start();
    if(GAME_CONFIG.backgroundMusicPath){this.music=new Audio(GAME_CONFIG.backgroundMusicPath);this.music.loop=true;this.music.volume=this.enabled?.22:0;await this.music.play().catch(()=>{})}
  }
  setEnabled(value){this.enabled=value;if(this.master)this.master.gain.setTargetAtTime(value?.32:0,this.ctx.currentTime,.05);if(this.music)this.music.volume=value?.22:0}
  #chirp(){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(1150+Math.random()*500,this.ctx.currentTime);o.frequency.exponentialRampToValueAtTime(1900,this.ctx.currentTime+.11);g.gain.setValueAtTime(.0001,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.055,this.ctx.currentTime+.025);g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+.18);o.connect(g).connect(this.master);o.start();o.stop(this.ctx.currentTime+.2)}
  setChase(active){if(this.chaseGain)this.chaseGain.gain.setTargetAtTime(active?.11:0,this.ctx.currentTime,.2)}
  roar(){if(!this.ctx||!this.enabled)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(105,this.ctx.currentTime);o.frequency.exponentialRampToValueAtTime(42,this.ctx.currentTime+1.1);g.gain.setValueAtTime(.25,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+1.2);o.connect(g).connect(this.master);o.start();o.stop(this.ctx.currentTime+1.25)}
  update(delta,moving,running){if(!this.ctx||!moving)return;this.stepTimer-=delta;if(this.stepTimer>0)return;this.stepTimer=running?.28:.43;const buffer=this.ctx.createBuffer(1,this.ctx.sampleRate*.08,this.ctx.sampleRate),d=buffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const src=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();filter.type='lowpass';filter.frequency.value=260;gain.gain.value=.09;src.buffer=buffer;src.connect(filter).connect(gain).connect(this.master);src.start()}
}
