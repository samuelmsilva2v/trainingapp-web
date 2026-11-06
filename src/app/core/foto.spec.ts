import { recorteCentral } from './foto';

describe('recorteCentral', () => {
  it('pega o maior quadrado no centro, em pé ou deitada', () => {
    expect(recorteCentral(4000, 3000)).toEqual({ x: 500, y: 0, lado: 3000 });
    expect(recorteCentral(1080, 1920)).toEqual({ x: 0, y: 420, lado: 1080 });
    expect(recorteCentral(256, 256)).toEqual({ x: 0, y: 0, lado: 256 });
  });
});
