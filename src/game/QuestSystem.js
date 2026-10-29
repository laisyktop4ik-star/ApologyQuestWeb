const REQUIRED_MEMORIES = new Set(['photo', 'letter', 'gift']);

export class QuestSystem {
  constructor() {
    this.stage = 'find-trail';
    this.memories = new Set();
  }

  activateSignpost() {
    if (this.stage !== 'find-trail') return false;
    this.stage = 'memories';
    return true;
  }

  collectMemory(id) {
    if (this.stage !== 'memories' || !REQUIRED_MEMORIES.has(id) || this.memories.has(id)) return false;
    this.memories.add(id);
    if (this.memories.size === REQUIRED_MEMORIES.size) this.stage = 'find-path';
    return true;
  }

  enterBearZone() {
    if (this.stage !== 'find-path') return false;
    this.stage = 'escape-bear';
    return true;
  }

  reachSafeZone() {
    if (this.stage !== 'escape-bear') return false;
    this.stage = 'final-clearing';
    return true;
  }

  openFinalLetter() {
    if (this.stage !== 'final-clearing') return false;
    this.stage = 'complete';
    return true;
  }

  createCheckpoint() {
    return { stage: this.stage, memories: [...this.memories] };
  }

  restoreCheckpoint(checkpoint) {
    this.stage = checkpoint.stage;
    this.memories = new Set(checkpoint.memories);
  }

  get objective() {
    const labels = {
      'find-trail': 'Найдите старый указатель у тропы',
      memories: `Соберите воспоминания: ${this.memories.size} / 3`,
      'find-path': 'Следуйте за тёплыми фонарями',
      'escape-bear': 'Бегите к освещённой поляне!',
      'final-clearing': 'Подойдите к фотографии',
      complete: 'Приключение завершено',
    };
    return labels[this.stage];
  }
}
