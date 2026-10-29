export class BearFSM {
  constructor(options = {}) {
    this.state = 'idle';
    this.alertDelay = options.alertDelay ?? 0.7;
    this.searchDuration = options.searchDuration ?? 4;
    this.attackDistance = options.attackDistance ?? 1.8;
    this.attackCooldown = options.attackCooldown ?? 1.2;
    this.timer = 0;
    this.cooldown = 0;
  }

  forceChase() {
    this.state = 'chase';
    this.timer = 0;
  }

  update(delta, context) {
    this.timer += delta;
    this.cooldown = Math.max(0, this.cooldown - delta);
    let didAttack = false;

    switch (this.state) {
      case 'idle':
        if (context.playerVisible) this.#enter('alert');
        break;
      case 'alert':
        if (!context.playerVisible) this.#enter('idle');
        else if (this.timer >= this.alertDelay) this.#enter('chase');
        break;
      case 'chase':
        if (!context.playerVisible) this.#enter('search');
        else if (context.distance <= this.attackDistance && this.cooldown <= 0) {
          this.#enter('attack');
          this.cooldown = this.attackCooldown;
          didAttack = true;
        }
        break;
      case 'attack':
        if (this.cooldown <= 0) this.#enter(context.playerVisible ? 'chase' : 'search');
        break;
      case 'search':
        if (context.playerVisible) this.#enter('chase');
        else if (this.timer >= this.searchDuration) this.#enter(context.inHomeRange ? 'idle' : 'return');
        break;
      case 'return':
        if (context.playerVisible) this.#enter('alert');
        else if (context.inHomeRange) this.#enter('idle');
        break;
    }

    return { state: this.state, didAttack };
  }

  #enter(next) {
    this.state = next;
    this.timer = 0;
  }
}
