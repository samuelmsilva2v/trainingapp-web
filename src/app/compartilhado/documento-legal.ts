import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';

export type TipoDocumento = 'termos' | 'privacidade';

/** Data da versão em vigor; mudar o texto é mudar esta data (o aceite ainda não é gravado: ver CLAUDE.md, fase 5). */
export const VERSAO_DOCUMENTOS = '21 de novembro de 2026';

/** Abre por cima da tela atual: no cadastro, sair para outra rota perderia o que já foi digitado. */
export function abrirDocumento(dialogo: MatDialog, tipo: TipoDocumento): void {
  dialogo.open(DocumentoLegal, {
    data: tipo,
    panelClass: 'dialogo-cheio',
    width: '100vw',
    height: '100dvh',
    maxWidth: '100vw',
    ariaLabel: tipo === 'termos' ? 'Termos de Uso' : 'Política de Privacidade',
  });
}

/**
 * Termos de Uso e Política de Privacidade (auditoria de UX, achado 03). Página pública em /termos e /privacidade
 * (o link que a Play Store pede) e diálogo de tela cheia no cadastro. O texto descreve só o que o app faz hoje.
 */
@Component({
  selector: 'app-documento-legal',
  template: `
    <header class="topo">
      <button type="button" class="btn-icone" [attr.aria-label]="ref ? 'Fechar' : 'Voltar'" (click)="voltar()">
        <span class="icone" aria-hidden="true">{{ ref ? 'close' : 'arrow_back' }}</span>
      </button>
      <h1 class="titulo-sm">{{ tipo === 'termos' ? 'Termos de Uso' : 'Política de Privacidade' }}</h1>
    </header>

    <article class="texto">
      <p class="suave versao">Versão de {{ versao }}</p>

      @if (tipo === 'termos') {
        <p>Estes termos valem para o TrainingApp, no navegador e no app Android. Ao criar uma conta, você concorda com eles e com a <a href="/privacidade" (click)="trocar($event, 'privacidade')">Política de Privacidade</a>.</p>

        <h2>1. O serviço</h2>
        <p>O TrainingApp é um diário de treino de musculação: você monta planos, registra as séries que fez e acompanha o histórico, o XP, as conquistas e a sequência de dias. O uso é gratuito. O app é mantido por um desenvolvedor independente e pode mudar, ficar fora do ar ou ser encerrado; quando possível, avisaremos antes no próprio app.</p>

        <h2>2. Saúde e segurança</h2>
        <p>O app não é orientação profissional. Cargas, repetições e descansos sugeridos vêm do seu plano e do seu histórico, não de uma avaliação. Antes de começar ou mudar um treino, procure um profissional de educação física ou um médico. Você é responsável por como executa os exercícios e pelas cargas que usa.</p>

        <h2>3. Sua conta</h2>
        <p>Use um e-mail seu e mantenha a senha em segredo. Você responde pelo que é feito na sua conta. O nome de exibição aparece para outras pessoas quando você compartilha um plano (só o primeiro nome), então não use um nome ofensivo ou que se passe por outra pessoa.</p>

        <h2>4. Uso permitido</h2>
        <p>Não tente acessar contas de outras pessoas, sobrecarregar ou atacar o serviço, nem usar o app para fins ilegais. Contas que fizerem isso podem ser suspensas ou excluídas.</p>

        <h2>5. Seu conteúdo</h2>
        <p>Seus planos, treinos e registros são seus. Ao gerar um link de compartilhamento, você autoriza quem abrir o link (com uma conta no app) a ver e salvar uma cópia do plano. O catálogo de exercícios e as fotos vêm do projeto free-exercise-db, de domínio público.</p>

        <h2>6. Encerramento</h2>
        <p>Você pode excluir a conta quando quiser, em Perfil &gt; Excluir conta e apagar dados. Isso apaga seus dados, como descrito na Política de Privacidade.</p>

        <h2>7. Limites de responsabilidade</h2>
        <p>O app é oferecido como está. Dentro do que a lei permite, não respondemos por lesões, por perda de dados causada por falhas fora do nosso controle nem por decisões tomadas com base no que o app mostra.</p>

        <h2>8. Mudanças e contato</h2>
        <p>Se estes termos mudarem, a data da versão no topo muda e avisaremos no app. Dúvidas: Perfil &gt; Reportar bug ou sugestão (a resposta chega no seu e-mail). Estes termos seguem a lei brasileira.</p>
      } @else {
        <p>Esta política explica quais dados o TrainingApp guarda, para quê e o que você pode fazer com eles, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). Ela vale junto com os <a href="/termos" (click)="trocar($event, 'termos')">Termos de Uso</a>.</p>

        <h2>1. Quem cuida dos dados</h2>
        <p>O TrainingApp é mantido por um desenvolvedor independente, que é o responsável pelos dados. Para qualquer pedido sobre seus dados, use Perfil &gt; Reportar bug ou sugestão; a resposta chega no seu e-mail.</p>

        <h2>2. O que guardamos</h2>
        <ul>
          <li><strong>Conta:</strong> nome de exibição, e-mail, a senha (só como hash, nunca o texto) e, se você entrar com o Google, o identificador da sua conta Google.</li>
          <li><strong>Foto do perfil:</strong> a da sua conta Google ou a que você enviar. Sem foto, o app mostra suas iniciais.</li>
          <li><strong>Treinos:</strong> planos, exercícios próprios, sessões com séries, repetições, cargas e horários.</li>
          <li><strong>Peso corporal:</strong> as pesagens que você registrar.</li>
          <li><strong>Gamificação:</strong> XP, nível, conquistas, desafios e sequência de dias.</li>
          <li><strong>Preferências:</strong> tema e lembrete de pesagem.</li>
          <li><strong>Relatos enviados:</strong> nome, categoria, mensagem, plataforma, versão do app, tela de onde você veio e o navegador ou aparelho.</li>
        </ul>

        <h2>3. O que fica no seu aparelho</h2>
        <p>O app guarda no aparelho o tema, as opções do treino, os lembretes e o treino em andamento (para funcionar sem internet). Para manter você conectado, usa um cookie de sessão no navegador ou o armazenamento seguro do Android no app. Não usamos cookies de publicidade nem de análise.</p>

        <h2>4. Para que usamos</h2>
        <p>Só para fazer o app funcionar: criar e proteger sua conta, salvar e mostrar seus treinos, calcular XP e conquistas, mandar os e-mails de confirmação de cadastro e de redefinição de senha e responder seus relatos. Não vendemos dados, não mostramos anúncios e não usamos seus dados para outros fins.</p>

        <h2>5. Com quem os dados passam</h2>
        <ul>
          <li><strong>Google:</strong> se você escolher entrar com o Google, para confirmar quem você é.</li>
          <li><strong>Gmail:</strong> envia os e-mails do app (confirmação, redefinição de senha e respostas a relatos).</li>
          <li><strong>Oracle Cloud:</strong> hospeda o servidor e o banco de dados, em São Paulo, Brasil.</li>
          <li><strong>jsDelivr:</strong> entrega as fotos dos exercícios; ao carregá-las, recebe o endereço IP do aparelho, como qualquer site.</li>
        </ul>

        <h2>6. Planos compartilhados</h2>
        <p>Quando você gera um link, uma cópia do plano (sem as cargas alvo) e o seu primeiro nome ficam visíveis para quem abrir o link com uma conta no app. O link não expira; excluir a conta apaga os links.</p>

        <h2>7. Por quanto tempo</h2>
        <p>Enquanto a conta existir. Ao excluir a conta (Perfil &gt; Excluir conta e apagar dados), tudo é apagado na hora, inclusive XP e conquistas. Cópias de segurança diárias do banco são guardadas por até 7 dias e podem conter seus dados até serem substituídas.</p>

        <h2>8. Seus direitos</h2>
        <p>Você pode pedir acesso aos seus dados, correção, exclusão e informações sobre como são tratados. O nome você muda no Perfil e a conta você exclui sozinho; os demais pedidos, pelo relato no Perfil.</p>

        <h2>9. Segurança</h2>
        <p>A conexão é sempre por HTTPS, a senha fica só como hash e a sessão usa chaves que você pode revogar saindo do app.</p>

        <h2>10. Mudanças</h2>
        <p>Se esta política mudar, a data da versão no topo muda e avisaremos no app.</p>
      }
    </article>
  `,
  styles: `
    :host { display: block; padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px)); }
    :host-context(.mat-mdc-dialog-surface) { padding-top: 0; }
    .topo { display: flex; align-items: center; gap: 8px; height: 64px; padding: 0 12px 0 8px; }
    .texto { max-width: 640px; margin: 0 auto; padding: 0 16px 32px; line-height: 1.55; }
    .versao { margin-top: 0; font-size: 13px; }
    h2 { margin: 24px 0 8px; font: 700 16px/22px var(--fonte-titulo); }
    p, li { color: var(--c-texto); }
    ul { padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
    a { color: var(--c-destaque); font-weight: 600; }
  `,
})
export class DocumentoLegal {
  protected readonly ref = inject(MatDialogRef<DocumentoLegal>, { optional: true });
  private readonly dados = inject<TipoDocumento | null>(MAT_DIALOG_DATA, { optional: true });
  private readonly rota = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  protected tipo: TipoDocumento = this.dados ?? this.rota?.snapshot.data['tipo'] ?? 'termos';
  protected readonly versao = VERSAO_DOCUMENTOS;

  protected voltar(): void {
    if (this.ref) this.ref.close();
    else if (history.length > 1) this.location.back();
    else void this.router.navigateByUrl('/entrar');
  }

  /** Um documento cita o outro: no diálogo troca o texto no lugar; como página, segue o link normal. */
  protected trocar(evento: Event, tipo: TipoDocumento): void {
    if (!this.ref) return;
    evento.preventDefault();
    this.tipo = tipo;
  }
}
