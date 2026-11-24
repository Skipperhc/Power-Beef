import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService, Usuario } from '../auth/auth.service';
import { CarrinhoService } from './carrinho.service';
import { NotificacoesService } from '../shared/notificacoes.service';

describe('Carrinho de visitante',()=>{
  const usuario=signal<Usuario|null>(null);
  const chave='00000000-0000-4000-8000-000000000001';
  const conta:Usuario={id:'cliente-a',nome:'Cliente A',email:'a@example.com',perfil:'cliente'};
  beforeEach(()=>{localStorage.clear();usuario.set(null);TestBed.configureTestingModule({providers:[{provide:AuthService,useValue:{usuario}}]});});
  afterEach(()=>vi.restoreAllMocks());
  it('salva só os itens do visitante e recalcula preços sem confiar no cache',()=>{
    const carrinho=TestBed.inject(CarrinhoService);expect(carrinho.adicionar('original',4)).toBe(true);expect(carrinho.precos().totalCentavos).toBe(6990);
    const salvo=JSON.parse(localStorage.getItem('pb_carrinho_visitante')!);expect(salvo.itens).toEqual([{tipo:'original',quantidade:4}]);expect(salvo.expiraEm).toBeGreaterThan(Date.now());expect(salvo.entrega).toBeUndefined();expect(salvo.totalCentavos).toBeUndefined();
    expect(()=>carrinho.prepararPedido({nome:'Maria',whatsapp:'41999068051',endereco:'Rua Teste 123',referencia:''})).toThrow();
  });
  it('ignora cache inválido ou expirado',()=>{
    localStorage.setItem('pb_carrinho_visitante',JSON.stringify({itens:[null],expiraEm:Date.now()+10000}));
    expect(TestBed.inject(CarrinhoService).total()).toBe(0);
  });
  it('não restaura itens de visitante depois da expiração',()=>{
    localStorage.setItem('pb_carrinho_visitante',JSON.stringify({itens:[{tipo:'original',quantidade:4}],chaveEnvio:chave,expiraEm:Date.now()-1}));expect(TestBed.inject(CarrinhoService).total()).toBe(0);
  });
  it('combina o carrinho uma vez e mantém contas e logout separados',()=>{
    localStorage.setItem('pb_carrinho_cliente-a',JSON.stringify({chaveEnvio:chave,itens:[{tipo:'original',quantidade:3},{tipo:'picante',quantidade:5}]}));
    const c=TestBed.inject(CarrinhoService);c.adicionar('original',2);c.adicionar('churrasco',1);usuario.set(conta);TestBed.tick();expect(c.total()).toBe(11);expect(c.itens().find(i=>i.tipo==='original')?.quantidade).toBe(5);TestBed.tick();expect(c.total()).toBe(11);expect(localStorage.getItem('pb_carrinho_visitante')).toBeNull();
    const pedido=c.prepararPedido({nome:'Maria',whatsapp:'41999068051',endereco:'Rua Teste 123',referencia:''});expect(Object.keys(pedido).sort()).toEqual(['chaveEnvio','entrega','itens']);
    usuario.set(null);TestBed.tick();expect(c.total()).toBe(0);c.adicionar('original',1);usuario.set({...conta,id:'cliente-b'});TestBed.tick();expect(c.total()).toBe(1);usuario.set(conta);TestBed.tick();expect(c.total()).toBe(11);
  });
  it('evita repetir a soma quando o navegador não consegue apagar o visitante',()=>{
    const c=TestBed.inject(CarrinhoService);c.adicionar('original',2);const visitanteSalvo=localStorage.getItem('pb_carrinho_visitante')!;
    usuario.set(conta);TestBed.tick();expect(c.total()).toBe(2);
    localStorage.setItem('pb_carrinho_visitante',visitanteSalvo);TestBed.resetTestingModule();TestBed.configureTestingModule({providers:[{provide:AuthService,useValue:{usuario}}]});expect(TestBed.inject(CarrinhoService).total()).toBe(2);
  });
  it('mantém o carrinho em memória sem duplicar itens quando a gravação falha',()=>{
    const c=TestBed.inject(CarrinhoService);c.adicionar('original',2);const storage=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('Sem espaço');});
    usuario.set(conta);TestBed.tick();expect(c.total()).toBe(2);c.adicionar('picante',1);expect(c.total()).toBe(3);c.alterar('picante',2);expect(c.total()).toBe(4);storage.mockRestore();c.alterar('picante',3);expect(c.total()).toBe(5);expect(JSON.parse(localStorage.getItem('pb_carrinho_cliente-a')!).itens.find((i:any)=>i.tipo==='original').quantidade).toBe(2);
  });
  it('respeita o limite por sabor e avisa sobre a combinação',()=>{
    localStorage.setItem('pb_carrinho_cliente-a',JSON.stringify({chaveEnvio:chave,itens:[{tipo:'original',quantidade:900}]}));const c=TestBed.inject(CarrinhoService);c.adicionar('original',200);usuario.set(conta);TestBed.tick();expect(c.total()).toBe(1000);expect(TestBed.inject(NotificacoesService).mensagens().some(m=>m.tipo==='informacao'&&m.mensagem.includes('1.000'))).toBe(true);
  });
});
