import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthApi, PerfilApi, ProvaDeIdentidade, mensagemDeErro } from '../core/api';
import { Falha, falhaDe } from '../core/falha';
import { TelaErro } from '../compartilhado/tela-erro';
import { ForcaSenha } from '../compartilhado/forca-senha';
import { AuthStore } from '../core/auth';
import { formatarKg } from '../core/formatos';
import { familias, metaComUnidade, visiveis } from '../core/conquistas';
import { diasEntre, hojeIso } from '../core/peso';
import { NO_APP } from '../core/cofre';
import { ConfigLembrete, lerLembrete, salvarLembrete } from '../core/lembrete';
import { avisoDescansoLigado, salvarAvisoDescanso } from '../core/android';
import { GoogleCodigo, criarClienteGoogle, idTokenDoGoogle } from '../core/google';
import { GamificacaoStore } from '../core/gamificacao-store';
import { Perfil } from '../core/modelos';
import { senhaForte } from '../core/senha';
import { PesoSecao } from './peso/peso-secao';

/** Título padrão do card do usuário; vai virar um sistema de títulos por nível. */
const TITULO_PADRAO = 'Praticante de musculação';

@Component({
  selector: 'app-perfil',
  imports: [ForcaSenha, PesoSecao, TelaErro, NgTemplateOutlet],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class PerfilTela implements OnInit {
  private readonly api = inject(PerfilApi);
  private readonly aviso = inject(MatSnackBar);
  private readonly auth = inject(AuthStore);
  private readonly authApi = inject(AuthApi);
  protected readonly gamificacao = inject(GamificacaoStore);
  protected readonly formatar = formatarKg;
  protected readonly titulo = TITULO_PADRAO;

  protected readonly carregando = signal(true);
  protected readonly salvando = signal(false);
  protected readonly erro = signal<Falha | null>(null);

  protected readonly nome = signal('');
  private readonly salvo = signal<Perfil | null>(null);
  protected readonly nomeSalvo = computed(() => this.salvo()?.nome ?? '');
  protected readonly email = computed(() => this.salvo()?.email ?? '');
  protected readonly temSenha = computed(() => this.salvo()?.temSenha ?? false);
  protected readonly trocandoSenha = signal(false);
  protected readonly senhaAtual = signal('');
  protected readonly novaSenha = signal('');
  protected readonly senhaValida = computed(() => this.senhaAtual().length > 0 && senhaForte(this.novaSenha()));
  protected readonly excluindo = signal(false);
  protected readonly senhaDaExclusao = signal('');
  /** Conta só do Google: o botão de confirmar só habilita quando o popup do Google está pronto para abrir. */
  protected readonly googlePronto = signal(false);
  private clienteGoogle: GoogleCodigo | null = null;
  /** Só no app: o client id web que o Credential Manager usa. */
  private webClientId: string | null = null;
  protected readonly conquistasAbertas = signal(false);
  /** Conquistas por família (a próxima faixa em destaque) e a família com as faixas abertas. */
  /** As ocultas não feitas nem aparecem nem entram na contagem. */
  protected readonly conquistasVisiveis = computed(() => visiveis(this.gamificacao.dados()?.conquistas ?? []));
  protected readonly familias = computed(() => familias(this.conquistasVisiveis()));
  protected readonly familiaAberta = signal<string | null>(null);
  protected readonly metaComUnidade = metaComUnidade;
  protected readonly noApp = NO_APP;
  protected readonly lembrete = signal<ConfigLembrete>(lerLembrete());
  protected readonly avisoDescanso = signal(avisoDescansoLigado());
  protected readonly diasDaSemana = [
    { valor: 0, letra: 'D', nome: 'Domingo' },
    { valor: 1, letra: 'S', nome: 'Segunda' },
    { valor: 2, letra: 'T', nome: 'Terça' },
    { valor: 3, letra: 'Q', nome: 'Quarta' },
    { valor: 4, letra: 'Q', nome: 'Quinta' },
    { valor: 5, letra: 'S', nome: 'Sexta' },
    { valor: 6, letra: 'S', nome: 'Sábado' },
  ];
  /** "Faltam N dias" até a semana dos desafios virar (domingo é o último dia). */
  protected readonly textoFimDaSemana = computed(() => {
    const fim = this.gamificacao.dados()?.semanaTerminaEm;
    if (!fim) return '';
    const dias = diasEntre(hojeIso(), fim);
    return dias <= 0 ? 'Termina hoje' : dias === 1 ? 'Falta 1 dia' : `Faltam ${dias} dias`;
  });

  protected readonly conquistadas = computed(() => this.conquistasVisiveis().filter(c => c.conquistada).length);

  protected readonly lembretePeso = computed(() => this.salvo()?.lembretePesoDias ?? null);
  protected readonly frequenciasPeso = [7, 15, 30];

  protected readonly alterado = computed(() => this.salvo()?.nome !== this.nome().trim());
  protected readonly valido = computed(() => this.nome().trim().length > 0);

  ngOnInit(): void {
    this.gamificacao.atualizar();
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.obter().subscribe({
      next: perfil => {
        this.aplicar(perfil);
        this.carregando.set(false);
      },
      error: e => {
        this.erro.set(falhaDe(e));
        this.carregando.set(false);
      },
    });
  }

  private aplicar(perfil: Perfil): void {
    this.salvo.set(perfil);
    this.nome.set(perfil.nome);
  }

  protected salvar(): void {
    if (!this.valido() || this.salvando()) return;
    this.salvando.set(true);
    this.api.atualizar({ nome: this.nome().trim(), lembretePesoDias: this.lembretePeso() }).subscribe({
      next: perfil => {
        this.aplicar(perfil);
        this.salvando.set(false);
        this.aviso.open('Perfil salvo.', undefined, { duration: 3000 });
      },
      error: e => {
        this.salvando.set(false);
        this.aviso.open(mensagemDeErro(e), 'OK', { duration: 6000 });
      },
    });
  }

  /** Salva na hora, com o nome já salvo: o que está sendo digitado no campo de nome continua lá. */
  protected mudarLembretePeso(dias: number | null): void {
    const salvo = this.salvo();
    if (!salvo || salvo.lembretePesoDias === dias) return;
    this.salvo.set({ ...salvo, lembretePesoDias: dias });
    this.api.atualizar({ nome: salvo.nome, lembretePesoDias: dias }).subscribe({
      next: perfil => this.salvo.set(perfil),
      error: e => {
        this.salvo.set(salvo);
        this.aviso.open(mensagemDeErro(e), 'OK', { duration: 6000 });
      },
    });
  }

  protected trocarSenha(): void {
    if (!this.senhaValida() || this.salvando()) return;
    this.salvando.set(true);
    this.authApi.trocarSenha(this.senhaAtual(), this.novaSenha()).subscribe({
      next: () => {
        this.salvando.set(false);
        this.trocandoSenha.set(false);
        this.senhaAtual.set('');
        this.novaSenha.set('');
        this.aviso.open('Senha alterada. Os outros aparelhos foram desconectados.', undefined, { duration: 4000 });
      },
      error: e => {
        this.salvando.set(false);
        this.aviso.open(mensagemDeErro(e), 'OK', { duration: 6000 });
      },
    });
  }

  /** Abre a confirmação. Na conta só do Google já prepara o popup, que o navegador só deixa abrir direto de um clique. */
  protected abrirExclusao(): void {
    this.excluindo.set(true);
    if (this.temSenha() || this.clienteGoogle || this.webClientId) return;
    this.authApi.config().subscribe({
      next: ({ googleClientId }) => {
        if (!googleClientId) return;
        if (NO_APP) {
          // No app o popup do Google não abre: a prova é o ID token do Credential Manager.
          this.webClientId = googleClientId;
          this.googlePronto.set(true);
          return;
        }
        criarClienteGoogle(googleClientId, codigo => this.excluirComCodigo(codigo), tipo => {
          if (tipo === 'popup_failed_to_open') {
            this.aviso.open('Não foi possível abrir a janela do Google. Libere os pop-ups e tente de novo.', 'OK', { duration: 6000 });
          }
        })
          .then(cliente => {
            this.clienteGoogle = cliente;
            this.googlePronto.set(true);
          })
          .catch(() => undefined);
      },
      error: () => undefined,
    });
  }

  protected cancelarExclusao(): void {
    this.excluindo.set(false);
    this.senhaDaExclusao.set('');
  }

  protected excluirComSenha(): void {
    if (!this.senhaDaExclusao() || this.salvando()) return;
    this.excluir({ senha: this.senhaDaExclusao() });
  }

  protected confirmarComGoogle(): void {
    if (this.webClientId) {
      void this.confirmarComGoogleNoApp(this.webClientId);
      return;
    }
    this.clienteGoogle?.requestCode();
  }

  private async confirmarComGoogleNoApp(webClientId: string): Promise<void> {
    const idToken = await idTokenDoGoogle(webClientId).catch(() => null);
    if (!idToken) {
      this.aviso.open('O Google não autorizou a confirmação. Tente de novo.', 'OK', { duration: 6000 });
      return;
    }
    this.excluir({ idToken });
  }

  private excluirComCodigo(codigo?: string): void {
    if (!codigo) {
      this.aviso.open('O Google não autorizou a confirmação. Tente de novo.', 'OK', { duration: 6000 });
      return;
    }
    this.excluir({ codigo });
  }

  private excluir(prova: ProvaDeIdentidade): void {
    this.salvando.set(true);
    // Deu certo: o app recarrega na tela de login e nada da conta fica na memória.
    this.auth.excluirConta(prova).subscribe({
      error: e => {
        this.salvando.set(false);
        this.aviso.open(mensagemDeErro(e), 'OK', { duration: 6000 });
      },
    });
  }

  /** Aviso de fim do descanso: guardado no aparelho; desligar cancela o aviso já agendado. */
  protected alternarAvisoDescanso(): void {
    this.avisoDescanso.update(ligado => !ligado);
    salvarAvisoDescanso(this.avisoDescanso());
  }

  /** Lembrete de treino: guardado no aparelho e reagendado a cada mudança. */
  protected alterarLembrete(mudanca: Partial<ConfigLembrete>): void {
    this.lembrete.update(atual => ({ ...atual, ...mudanca }));
    void salvarLembrete(this.lembrete());
  }

  protected mudarHora(hora: string): void {
    if (/^d{2}:d{2}$/.test(hora)) this.alterarLembrete({ hora });
  }

  protected alternarDia(dia: number): void {
    const dias = this.lembrete().dias;
    this.alterarLembrete({ dias: dias.includes(dia) ? dias.filter(d => d !== dia) : [...dias, dia].sort() });
  }

  protected sair(): void {
    this.auth.sair().subscribe();
  }
}
