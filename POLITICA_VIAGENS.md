# HopOn - Política de Viagens

> Documento de referência para implementação técnica e texto legal da app.
> Todas as regras aqui definidas têm de ser aceites explicitamente pelo utilizador antes de poder reservar ou publicar uma boleia.

---

## 1. Modelo de Negócio

### 1.1 Princípio base
O HopOn é uma plataforma de **partilha de custos**, não de transporte pago.
O condutor **não ganha dinheiro** - apenas recupera os custos reais da viagem (combustível + portagens).
A HopOn cobra uma comissão de serviço de **10%** sobre o valor por lugar, paga pelo passageiro.

### 1.2 Fórmula de cálculo do preço

```
custo_combustivel = (consumo_L/100km ÷ 100) × distância_real_km × preço_combustivel_hoje (DGEG)
custo_portagens   = valor real calculado pela Google Maps Routes API para a rota escolhida
custo_total       = custo_combustivel + custo_portagens

preço_por_lugar   = custo_total ÷ nº_lugares_disponíveis
comissão_hopon    = preço_por_lugar × 10%
passageiro_paga   = preço_por_lugar + comissão_hopon
condutor_recebe   = preço_por_lugar (100% do custo de recuperação)
hopon_recebe      = comissão_hopon
```

### 1.3 Variáveis por tipo de combustível

| Tipo | Cálculo |
|---|---|
| Gasolina 95 | consumo (L/100km) × preço DGEG gasolina 95 |
| Gasóleo | consumo (L/100km) × preço DGEG gasóleo |
| GPL | consumo (L/100km) × preço DGEG GPL |
| Elétrico | consumo (kWh/100km) × preço médio eletricidade Portugal |
| Híbrido | consumo combinado (L/100km) × preço DGEG gasolina 95 |

> **Fonte preços combustível:** API pública DGEG (Direção-Geral de Energia e Geologia) - atualizada semanalmente.
> **Fonte consumo do veículo:** introduzido pelo condutor ao registar o carro (consumo real, não WLTP).

### 1.4 Transparência de preços
O passageiro vê sempre o breakdown completo antes de confirmar:
```
Combustível:   €X.XX
Portagens:     €X.XX
Taxa de serviço (10%): €X.XX
─────────────────────
Total por lugar: €X.XX
```

---

## 2. Rotas e Tráfego

### 2.1 Seleção de rota na criação da boleia
Ao criar uma boleia, o condutor escolhe a rota com base em dados reais de tráfego previsto para a hora de partida.

A app apresenta até 3 alternativas via **Google Maps Routes API** com `departureTime`:
- Rota mais rápida (recomendada)
- Rota alternativa (ex: menos portagens)
- Rota sem portagens (se existir)

Cada opção mostra: distância real, tempo estimado com tráfego, custo de portagens, e preço por lugar resultante.

### 2.2 Alteração de rota após reserva

**Regras:**
- O condutor só pode alterar a rota **1 vez** após a boleia ter passageiros confirmados.
- Quando o condutor propõe uma nova rota, todos os passageiros recebem uma **notificação push obrigatória**.
- Cada passageiro tem **24 horas** para aceitar ou recusar.
- Se o passageiro **não responder em 24 horas**, o dinheiro fica para o condutor e o passageiro é removido da viagem automaticamente.

**Se a nova rota for mais cara:**
- O passageiro paga a diferença se aceitar.
- Se recusar, sai da viagem e recebe reembolso total.

**Se a nova rota for mais barata:**
- O passageiro recebe reembolso da diferença para o método de pagamento original.
- Se não tiver sido pago com cartão, fica como saldo na wallet da app.

**Redistribuição de preços quando um passageiro sai:**
- Sempre que um passageiro sai (por recusa de rota ou cancelamento), o preço por lugar é recalculado para os restantes.
- Todos os passageiros restantes recebem notificação push obrigatória com o novo preço e têm de aceitar para permanecer na viagem.

---

## 3. Política de Cancelamento - Passageiro

| Momento do cancelamento | Reembolso ao passageiro | Para o condutor |
|---|---|---|
| Mais de 24h antes da partida | 100% | 0% |
| Entre 2h e 24h antes da partida | 50% | 50% |
| Menos de 2h antes da partida | 0% | 100% |
| No-show (não aparece no ponto) | 0% | 100% |

> O reembolso é devolvido ao **método de pagamento original** (cartão/MB WAY).
> Se não for possível (ex: método expirado), o valor fica como **saldo na wallet da app**.

---

## 4. Política de Cancelamento - Condutor

| Momento do cancelamento | Consequência |
|---|---|
| Qualquer altura antes da partida | Reembolso total (100%) a todos os passageiros |
| Cancelamentos frequentes | Penalização no perfil (badge de fiabilidade reduzido) |

> O condutor não pode cancelar apenas para alguns passageiros - o cancelamento é sempre total.

---

## 5. Política de No-Show (Passageiro não aparece)

### Fluxo obrigatório:
1. Na hora de partida, o condutor carrega **"Estou no ponto de encontro"** na app.
2. O passageiro recebe notificação push imediata: *"O teu condutor está à tua espera em [local]!"*
3. Conta-se um prazo de **10 minutos**.
4. Se o passageiro não aparecer, o condutor carrega **"Passageiro não apareceu"**.
5. O dinheiro do passageiro é transferido para o condutor imediatamente.
6. O passageiro recebe notificação: *"Perdeste a tua boleia. O valor não será reembolsado."*
7. O condutor pode partir.

> **Porquê 10 minutos?** O condutor tem o seu próprio horário (trabalho, escola). Esperar mais seria injusto.

---

## 6. Aceitação de Políticas pelo Utilizador

### 6.1 No registo (todos os utilizadores)
- Termos e Condições Gerais
- Política de Privacidade (RGPD)

### 6.2 Antes do primeiro booking como passageiro
Página de política obrigatória com checkbox explícito:
- Política de cancelamento (tabela com %, prazos)
- Política de no-show (10 min, sem reembolso)
- Como funcionam os reembolsos
- Aceitação de alterações de rota (24h para responder)

**O utilizador não pode continuar sem selecionar a opção de aceitação.**

### 6.3 Antes de publicar a primeira boleia como condutor
Página de política obrigatória com checkbox explícito:
- Responsabilidade de aparecer no ponto de encontro
- Só 1 alteração de rota permitida
- Regras de cancelamento pelo condutor
- Como e quando recebe o dinheiro

**O condutor não pode publicar boleias sem selecionar a opção de aceitação.**

---

## 7. Pagamentos e Reembolsos

### 7.1 Métodos suportados (a implementar)
- Cartão de crédito/débito (Stripe)
- MB WAY (Stripe Portugal / integração direta)
- Saldo da wallet HopOn

### 7.2 Quando é que o dinheiro se move

| Evento | Movimento |
|---|---|
| Passageiro confirma booking | Débito imediato do passageiro (valor retido) |
| Viagem concluída | Crédito ao condutor |
| Cancelamento com reembolso | Devolução ao cartão original (3-5 dias úteis) ou wallet |
| No-show | Transferência imediata para o condutor |
| Alteração de rota aceite (mais cara) | Débito da diferença ao passageiro |
| Alteração de rota - saída do passageiro | Reembolso total ao passageiro |

### 7.3 Comissão HopOn
- **10%** sobre o preço por lugar
- Paga pelo passageiro (adicionada ao preço base)
- Sempre visível no breakdown antes de confirmar

---

## 8. Regras Adicionais

### 8.1 Teto de preço manual
O condutor pode ajustar o preço sugerido, mas **nunca pode ultrapassar 20% acima do valor calculado automaticamente**.
A app bloqueia a submissão se o preço introduzido exceder esse limite.

```
preço_máximo_permitido = preço_sugerido × 1.20
```

### 8.2 Antecedência mínima de booking
O passageiro pode reservar uma boleia até **10 minutos antes** da hora de partida.
Após esse prazo, a boleia fecha automaticamente para novas reservas.

### 8.3 Disputas de no-show
Se o passageiro contestar um no-show, o fluxo é:

1. O pagamento fica **retido 2 horas** antes de ser transferido para o condutor.
2. O passageiro tem essas 2 horas para abrir uma disputa na app.
3. A app verifica automaticamente via **GPS**:
   - O condutor estava no local de encontro? (GPS da app no momento)
   - O passageiro estava a mais de X metros do local? (GPS da app no momento)
4. Se os dados GPS forem conclusivos → resolução automática.
5. Se houver dúvida → equipa HopOn revê e decide em 24h.
6. Durante a disputa, o dinheiro fica retido na plataforma.

### 8.4 Cancelamento por força maior (condutor)
Se o condutor tiver de cancelar por emergência (acidente, doença, etc.):
- Todos os passageiros recebem **reembolso total**.
- O condutor **não é penalizado** no perfil se apresentar prova válida (foto do acidente, documento médico, etc.).
- O condutor submete a prova na app → equipa HopOn valida em 24h.
- Sem prova → cancelamento normal (penaliza perfil).

### 8.5 Isenção de responsabilidade - Seguro
O HopOn é uma plataforma de mediação de partilha de custos entre particulares.
A HopOn **não é responsável** por acidentes, danos, ou lesões ocorridas durante as viagens.
O seguro do veículo é da responsabilidade exclusiva do condutor.
Os utilizadores aceitam este ponto explicitamente ao registar-se.

---

## 10. Dados do Veículo necessários para cálculo

Para que o cálculo seja preciso, o condutor tem de preencher ao registar o carro:

| Campo | Exemplo | Obrigatório |
|---|---|---|
| Marca | Toyota | ✅ |
| Modelo | Corolla | ✅ |
| Ano | 2021 | ✅ |
| Tipo de combustível | Gasóleo | ✅ |
| Consumo médio real | 5.5 L/100km | ✅ |
| Matrícula | AA-00-BB | ✅ |
| Nº de lugares | 5 | ✅ |

> O consumo médio real é introduzido pelo condutor - é o valor que conhece do dia-a-dia, não o valor WLTP do manual.

---

## 11. Resumo das Regras para Comunicação na App

Texto sugerido para mostrar ao utilizador:

> **Como funciona o preço?**
> O preço de cada lugar é calculado com base no combustível real do carro do condutor, ao preço atual em Portugal, mais as portagens da rota. Adicionamos uma taxa de serviço de 10%. O condutor não lucra - apenas recupera o que gasta.

> **E se precisar de cancelar?**
> Podes cancelar grátis até 24h antes. Depois disso, o reembolso é parcial ou nulo (o condutor tem de ser compensado pelo lugar vazio que deixaste).

> **E se não aparecer?**
> O condutor esperará 10 minutos. Se não chegares, perdes o valor da viagem sem reembolso.

---

*Última atualização: 2026-03-02*
*Este documento é a fonte de verdade para todas as implementações de pagamento, cancelamento e rotas no HopOn.*
