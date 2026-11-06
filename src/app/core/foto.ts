import { InjectionToken } from '@angular/core';

/** A foto do perfil vai para a API já cortada no centro e reduzida a 256×256 em JPEG (web#60): sem tela de recorte. */
export const LADO_FOTO = 256;

/** O maior quadrado no centro da imagem. */
export function recorteCentral(largura: number, altura: number): { x: number; y: number; lado: number } {
  const lado = Math.min(largura, altura);
  return { x: (largura - lado) / 2, y: (altura - lado) / 2, lado };
}

/** Lança se o aparelho não souber ler a imagem (ex.: HEIC num WebView antigo). */
export async function reduzirFoto(arquivo: Blob): Promise<Blob> {
  const imagem = await createImageBitmap(arquivo);
  const { x, y, lado } = recorteCentral(imagem.width, imagem.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = LADO_FOTO;
  canvas.getContext('2d')!.drawImage(imagem, x, y, lado, lado, 0, 0, LADO_FOTO, LADO_FOTO);
  imagem.close();
  return new Promise((pronto, falhou) =>
    canvas.toBlob(blob => (blob ? pronto(blob) : falhou(new Error('Falha ao gerar a foto'))), 'image/jpeg', 0.85),
  );
}

/** Por injeção, para os testes trocarem (jsdom não tem canvas nem createImageBitmap). */
export const REDUZIR_FOTO = new InjectionToken<(arquivo: Blob) => Promise<Blob>>('REDUZIR_FOTO', {
  providedIn: 'root',
  factory: () => reduzirFoto,
});
