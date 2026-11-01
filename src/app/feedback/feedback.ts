import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { FeedbackApi, PerfilApi } from '../core/api';
import { NO_APP } from '../core/cofre';
import { CategoriaFeedback } from '../core/modelos';

export const NOME_MAX = 100;
export const MENSAGEM_MIN = 10;
export const MENSAGEM_MAX = 2000;
const USER_AGENT_MAX = 500;

export const CATEGORIAS: { valor: CategoriaFeedback; rotulo: string; icone: string }[] = [
  { valor: 'BUG', rotulo: 'Reportar bug', icone: 'bug_report' },
  { valor: 'MELHORIA', rotulo: 'Sugestão de melhoria', icone: 'lightbulb' },
  { valor: 'FUNCIONALIDADE', rotulo: 'Nova funcionalidade', icone: 'add_circle' },
  { valor: 'OUTRO', rotulo: 'Outro', icone: 'chat' },
];

/** Mensagem de falha no envio; o texto continua no formulário em todos os casos. */
export function mensagemDeFalha(erro: unknown): string {
  if (erro instanceof HttpErrorResponse) {
    if (erro.status === 0) return 'Sem conexão. Tente de novo mais tarde.';
    if (erro.status === 429) return 'Limite de envios do dia atingido.';
  }
  return 'Não foi possível enviar. Tente de novo mais tarde.';
}

/** Reportar bug ou sugestão: vai por e-mail para a equipe, com o e-mail da conta para a resposta. */
@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.html',
  styleUrl: './feedback.scss',
})
export class FeedbackTela implements OnInit {
  private readonly api = inject(FeedbackApi);
  private readonly perfil = inject(PerfilApi);
  private readonly roteador = inject(Router);
  private readonly aviso = inject(MatSnackBar);

  protected readonly categorias = CATEGORIAS;
  protected readonly nomeMax = NOME_MAX;
  protected readonly mensagemMax = MENSAGEM_MAX;

  protected readonly nome = signal('');
  protected readonly categoria = signal<CategoriaFeedback | null>(null);
  protected readonly mensagem = signal('');
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  /** A tela de onde a pessoa chegou ao Perfil (vem no state da navegação; some se a página for recarregada). */
  private readonly tela: string | null = (history.state?.tela as string | undefined) ?? null;

  protected readonly aberto = signal(false);
  private readonly escolhida = computed(() => CATEGORIAS.find(c => c.valor === this.categoria()));
  protected readonly icone = computed(() => this.escolhida()?.icone ?? 'chat');
  protected readonly rotuloCategoria = computed(() => this.escolhida()?.rotulo ?? 'Selecione…');
  protected readonly tamanho = computed(() => this.mensagem().trim().length);
  protected readonly nomeValido = computed(() => this.nome().trim().length > 0);
  protected readonly mensagemValida = computed(() => this.tamanho() >= MENSAGEM_MIN && this.tamanho() <= MENSAGEM_MAX);
  protected readonly valido = computed(() => this.nomeValido() && this.categoria() !== null && this.mensagemValida());

  ngOnInit(): void {
    this.perfil.obter().subscribe({ next: p => { if (!this.nome()) this.nome.set(p.nome); }, error: () => {} });
  }

  protected escolherCategoria(valor: CategoriaFeedback): void {
    this.categoria.set(valor);
    this.aberto.set(false);
  }

  protected async enviar(): Promise<void> {
    const categoria = this.categoria();
    if (!this.valido() || !categoria || this.enviando()) return;
    this.enviando.set(true);
    this.erro.set(null);
    const versaoApp = NO_APP ? (await App.getInfo()).version : null;
    this.api.enviar({
      nome: this.nome().trim(),
      categoria,
      mensagem: this.mensagem().trim(),
      plataforma: NO_APP ? 'android' : 'web',
      versaoApp,
      tela: this.tela,
      userAgent: navigator.userAgent.slice(0, USER_AGENT_MAX),
    }).subscribe({
      next: () => {
        this.aviso.open('Obrigado! Recebemos sua mensagem.', undefined, { duration: 3000 });
        void this.roteador.navigate(['/perfil']);
      },
      error: e => {
        this.erro.set(mensagemDeFalha(e));
        this.enviando.set(false);
      },
    });
  }

  protected voltar(): void {
    void this.roteador.navigate(['/perfil']);
  }
}
