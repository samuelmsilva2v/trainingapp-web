import { Component, ElementRef, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SystemBars, SystemBarsStyle } from '@capacitor/core';
import { NO_APP } from '../core/cofre';
import { aplicarTema } from '../core/tema';

export interface VerFotosDados {
  nome: string;
  fotos: readonly string[];
  /** Foto que abre primeiro (índice em `fotos`). */
  indice: number;
}

const ZOOM_MAX = 3;
/** Até quantos px um toque ainda conta como toque, não como arraste. */
const TOLERANCIA_TOQUE = 10;
const DOIS_TOQUES_MS = 300;
const DESLIZE_MIN = 50;

/** Abre as fotos do exercício em tela cheia (o voltar do Android fecha, como qualquer diálogo). */
export function verFotos(dialogo: MatDialog, dados: VerFotosDados): void {
  if (!dados.fotos.length) return;
  const ref = dialogo.open(VerFotos, {
    data: dados,
    panelClass: 'dialogo-fotos',
    width: '100vw',
    height: '100dvh',
    maxWidth: '100vw',
    maxHeight: '100dvh',
  });
  // Fundo preto também no tema claro: ícones claros nas barras do Android enquanto estiver aberto.
  if (NO_APP) {
    void SystemBars.setStyle({ style: SystemBarsStyle.Dark }).catch(() => undefined);
    ref.afterClosed().subscribe(() => aplicarTema());
  }
}

/** Visualizador das fotos: deslizar ou setas trocam a foto; pinça, roda do mouse, dois toques ou clique dão zoom. */
@Component({
  selector: 'app-ver-fotos',
  template: `
    <div class="visor">
      <header class="topo">
        <h2 class="titulo-sm nome">{{ dados.nome }}</h2>
        <button type="button" class="btn-icone" aria-label="Fechar" (click)="ref.close()">
          <span class="icone" aria-hidden="true">close</span>
        </button>
      </header>

      <div class="palco" (pointerdown)="apertar($event)" (pointermove)="mover($event)" (pointerup)="soltar($event)"
           (pointercancel)="cancelar($event)" (wheel)="rodar($event)">
        <div class="faixa" [style.transform]="'translateX(' + -indice() * 100 + '%)'">
          @for (foto of fotos(); track foto; let i = $index) {
            <div class="quadro">
              <img [src]="foto" draggable="false" [alt]="'Execução de ' + dados.nome + ', foto ' + (i + 1)"
                   [style.transform]="i === indice() ? 'translate(' + x() + 'px, ' + y() + 'px) scale(' + escala() + ')' : null"
                   (error)="falhou(foto)" />
            </div>
          }
        </div>
      </div>

      @if (fotos().length > 1) {
        <footer class="base">
          <button type="button" class="btn-icone" aria-label="Foto anterior" [disabled]="indice() === 0" (click)="irPara(indice() - 1)">
            <span class="icone" aria-hidden="true">chevron_left</span>
          </button>
          <span class="num" aria-live="polite">{{ indice() + 1 }}/{{ fotos().length }}</span>
          <button type="button" class="btn-icone" aria-label="Próxima foto" [disabled]="indice() === fotos().length - 1"
                  (click)="irPara(indice() + 1)">
            <span class="icone" aria-hidden="true">chevron_right</span>
          </button>
        </footer>
      }
    </div>
  `,
  styles: `
    /* Fundo preto nos dois temas: a foto é o assunto. */
    .visor { height: 100%; display: flex; flex-direction: column; background: #000; color: #fff; }
    .topo, .base { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 16px; padding-top: max(8px, env(safe-area-inset-top)); }
    .base { justify-content: center; gap: 24px; padding-bottom: max(8px, env(safe-area-inset-bottom)); }
    .nome { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .btn-icone { color: #fff; }
    .btn-icone:disabled { opacity: 0.3; }
    .palco { flex: 1; min-height: 0; overflow: hidden; touch-action: none; user-select: none; }
    .faixa { display: flex; height: 100%; transition: transform 0.2s ease; }
    .quadro { flex: 0 0 100%; overflow: hidden; }
    img { display: block; width: 100%; height: 100%; object-fit: contain; transform-origin: center; }
  `,
})
export class VerFotos {
  protected readonly dados = inject<VerFotosDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<VerFotos>);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly fotos = signal([...this.dados.fotos]);
  protected readonly indice = signal(Math.min(Math.max(this.dados.indice, 0), this.dados.fotos.length - 1));
  protected readonly escala = signal(1);
  protected readonly x = signal(0);
  protected readonly y = signal(0);

  private readonly ponteiros = new Map<number, { x: number; y: number }>();
  private inicio: { x: number; y: number; t: number } | null = null;
  private moveu = false;
  private ultimoToque = 0;

  protected irPara(i: number): void {
    if (i < 0 || i >= this.fotos().length) return;
    this.indice.set(i);
    this.zerarZoom();
  }

  /** Foto que não carregou (404 do dataset) sai da lista, mantendo a que está na tela. */
  protected falhou(foto: string): void {
    const atual = this.fotos()[this.indice()];
    const restantes = this.fotos().filter(f => f !== foto);
    if (!restantes.length) {
      this.ref.close();
      return;
    }
    this.fotos.set(restantes);
    this.indice.set(Math.max(restantes.indexOf(atual), 0));
  }

  protected apertar(e: PointerEvent): void {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    this.ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.ponteiros.size === 1) {
      this.inicio = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      this.moveu = false;
    } else {
      this.moveu = true; // pinça nunca vira toque
    }
  }

  protected mover(e: PointerEvent): void {
    const antes = this.ponteiros.get(e.pointerId);
    if (!antes) return;
    const outros = [...this.ponteiros.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p);
    this.ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.inicio && Math.hypot(e.clientX - this.inicio.x, e.clientY - this.inicio.y) > TOLERANCIA_TOQUE) this.moveu = true;

    if (outros.length === 1) {
      const outro = outros[0];
      const distAntes = Math.hypot(antes.x - outro.x, antes.y - outro.y);
      const distAgora = Math.hypot(e.clientX - outro.x, e.clientY - outro.y);
      if (distAntes > 0) this.ampliar(this.escala() * (distAgora / distAntes));
      // Cada dedo move a foto por metade do próprio deslocamento: o ponto médio da pinça arrasta a foto.
      this.arrastar((e.clientX - antes.x) / 2, (e.clientY - antes.y) / 2);
    } else if (outros.length === 0 && this.escala() > 1) {
      this.arrastar(e.clientX - antes.x, e.clientY - antes.y);
    }
  }

  protected soltar(e: PointerEvent): void {
    if (!this.ponteiros.delete(e.pointerId) || this.ponteiros.size || !this.inicio) return;
    const dx = e.clientX - this.inicio.x;
    if (!this.moveu) {
      this.tocou(e);
    } else if (this.escala() === 1 && Math.abs(dx) > DESLIZE_MIN) {
      this.irPara(this.indice() + (dx < 0 ? 1 : -1));
    }
    this.inicio = null;
  }

  protected cancelar(e: PointerEvent): void {
    this.ponteiros.delete(e.pointerId);
    if (!this.ponteiros.size) this.inicio = null;
  }

  protected rodar(e: WheelEvent): void {
    e.preventDefault();
    this.ampliar(this.escala() * Math.exp(-e.deltaY * 0.002));
  }

  /** Mouse: um clique alterna 1×/2×. Toque: dois toques seguidos alternam. */
  private tocou(e: PointerEvent): void {
    if (e.pointerType === 'mouse') {
      this.alternarZoom();
      return;
    }
    if (e.timeStamp - this.ultimoToque < DOIS_TOQUES_MS) {
      this.alternarZoom();
      this.ultimoToque = 0;
    } else {
      this.ultimoToque = e.timeStamp;
    }
  }

  private alternarZoom(): void {
    if (this.escala() > 1) this.zerarZoom();
    else this.ampliar(2);
  }

  private ampliar(escala: number): void {
    const nova = Math.min(Math.max(escala, 1), ZOOM_MAX);
    this.escala.set(nova);
    if (nova === 1) this.zerarZoom();
    else this.arrastar(0, 0);
  }

  /** Move a foto ampliada só enquanto ela passa da tela, sem deixar a borda dela entrar. */
  private arrastar(dx: number, dy: number): void {
    const img = this.host.nativeElement.querySelectorAll('.quadro img')[this.indice()] as HTMLImageElement | undefined;
    if (!img) return;
    // Tamanho da foto visível dentro da caixa (object-fit: contain), não da caixa.
    const proporcao = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
    const largura = Math.min(img.offsetWidth, img.offsetHeight * proporcao);
    const meiaL = Math.max(0, (largura * this.escala() - img.offsetWidth) / 2);
    const meiaA = Math.max(0, ((largura / proporcao) * this.escala() - img.offsetHeight) / 2);
    this.x.set(Math.min(Math.max(this.x() + dx, -meiaL), meiaL));
    this.y.set(Math.min(Math.max(this.y() + dy, -meiaA), meiaA));
  }

  private zerarZoom(): void {
    this.escala.set(1);
    this.x.set(0);
    this.y.set(0);
  }
}
