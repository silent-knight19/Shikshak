export class MathBuffer {
  private buffer = '';
  private inInline = false;
  private inDisplay = false;

  feed(chunk: string): string[] {
    const parts: string[] = [];
    let i = 0;
    let current = '';

    if (this.buffer) {
      current = this.buffer;
      this.buffer = '';
    }

    while (i < chunk.length) {
      if (!this.inInline && !this.inDisplay && chunk.startsWith('$$', i)) {
        parts.push(current);
        current = '$$';
        this.inDisplay = true;
        i += 2;
        continue;
      }
      if (!this.inDisplay && chunk.startsWith('$', i)) {
        const prev = i > 0 ? chunk[i - 1] : ' ';
        const next = i + 1 < chunk.length ? chunk[i + 1] : ' ';
        if (prev === '$') { i++; continue; }
        if (prev !== '\\' && /\s/.test(prev) && /\S/.test(next)) {
          parts.push(current);
          current = '$';
          this.inInline = true;
          i++;
          continue;
        }
      }
      if (this.inDisplay && chunk.startsWith('$$', i)) {
        current += '$$';
        parts.push(current);
        current = '';
        this.inDisplay = false;
        i += 2;
        continue;
      }
      if (this.inInline && chunk[i] === '$') {
        const prev = i > 0 ? chunk[i - 1] : '';
        if (prev !== '\\') {
          current += '$';
          parts.push(current);
          current = '';
          this.inInline = false;
          i++;
          continue;
        }
      }
      current += chunk[i];
      i++;
    }

    if (this.inInline || this.inDisplay) {
      this.buffer = current;
    } else if (current) {
      parts.push(current);
    }

    return parts;
  }

  flush(): string {
    const leftover = this.buffer;
    this.buffer = '';
    this.inInline = false;
    this.inDisplay = false;
    return leftover;
  }

  get isBuffering(): boolean {
    return this.inInline || this.inDisplay;
  }
}
