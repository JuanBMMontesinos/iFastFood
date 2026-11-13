import { PrismaClient, LedgerAccountType, LedgerSide } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed Completo do iFastFood no Supabase ---');

  // 1. CONFIGURAÇÕES GLOBAIS DA PLATAFORMA (AppConfig)
  console.log('1. Gravando AppConfig...');
  await prisma.appConfig.upsert({
    where: { key: 'platform.settings' },
    update: {
      value: {
        takeRateBasicBps: 1200,
        takeRateMarketplaceBps: 2300,
        gatewayFeeBps: 399,
        deliveryBaseFeeCents: 500,
        deliveryPerKmCents: 150,
        supportPhone: '+55 11 4002-8922',
        supportEmail: 'suporte@ifastfood.com.br',
      },
    },
    create: {
      key: 'platform.settings',
      description: 'Taxas globais, regras comerciais e canais de suporte',
      value: {
        takeRateBasicBps: 1200,
        takeRateMarketplaceBps: 2300,
        gatewayFeeBps: 399,
        deliveryBaseFeeCents: 500,
        deliveryPerKmCents: 150,
        supportPhone: '+55 11 4002-8922',
        supportEmail: 'suporte@ifastfood.com.br',
      },
    },
  });

  await prisma.appConfig.upsert({
    where: { key: 'platform.stats' },
    update: {
      value: {
        onTimeDeliveryRate: 99.4,
        courierTipPassThroughPercent: 100,
        satisfactionScore: 4.9,
      },
    },
    create: {
      key: 'platform.stats',
      description: 'Estatísticas de desempenho operacional e SLA',
      value: {
        onTimeDeliveryRate: 99.4,
        courierTipPassThroughPercent: 100,
        satisfactionScore: 4.9,
      },
    },
  });

  // 2. PÁGINAS CMS INSTITUCIONAIS (CmsPage)
  console.log('2. Gravando Páginas CMS...');
  await prisma.cmsPage.upsert({
    where: { slug: 'sobre-nos' },
    update: {},
    create: {
      slug: 'sobre-nos',
      title: 'Sobre o iFastFood',
      published: true,
      publishedAt: new Date(),
      sections: [
        {
          id: 'sec-hero',
          type: 'hero',
          title: 'Nossa Missão é Redefinir o Delivery no Brasil',
          subtitle: 'Conectando comunidades gastronômicas locais com tecnologia de ponta, sustentabilidade e equidade econômica.',
        },
        {
          id: 'sec-historia',
          type: 'text',
          title: 'Nossa História',
          content: 'O iFastFood nasceu da convicção de que o mercado de delivery precisava de uma alternativa mais justa e transparente. Durante anos, restaurantes sofreram com comissões exorbitantes que sufocavam margens, entregadores enfrentaram remunerações opacas sem clareza de rota, e clientes lidaram com cobranças ocultas.\n\nConstruímos uma plataforma orientada por engenharia de precisão: livro-razão de partidas dobradas para garantir conciliação financeira impecável, algoritmo de despacho baseado em proximidade geográfica e pontualidade, e aplicativos nativos fluidos para cada participante do ecossistema.',
        },
        {
          id: 'sec-pilares',
          type: 'features',
          title: 'Nossos 3 Pilares Fundamentais',
          items: [
            {
              title: 'Equidade para os Parceiros',
              description: 'Taxas comissionárias competitivas que permitem aos donos de restaurantes prosperar e investir em sua operação.',
            },
            {
              title: 'Valorização do Entregador',
              description: 'Cálculo transparente de tarifa base + quilometragem e 100% das gorjetas repassadas integralmente.',
            },
            {
              title: 'Transparência para o Consumidor',
              description: 'Rastreamento com precisão métrica, código PIN de segurança e suporte que realmente resolve problemas.',
            },
          ],
        },
      ],
    },
  });

  await prisma.cmsPage.upsert({
    where: { slug: 'termos-de-uso' },
    update: {},
    create: {
      slug: 'termos-de-uso',
      title: 'Termos e Condições de Uso da Plataforma',
      published: true,
      publishedAt: new Date(),
      sections: [
        {
          id: 'sec-hero-termos',
          type: 'hero',
          title: 'Termos e Condições de Uso',
          subtitle: 'Regras de utilização dos nossos serviços e direitos dos usuários.',
        },
        {
          id: 'sec-termos-content',
          type: 'text',
          title: 'Condições Gerais',
          content: 'Ao utilizar a plataforma iFastFood (via aplicativo móvel ou web), você concorda integralmente com estes Termos de Uso. O iFastFood atua como intermediador tecnológico entre clientes, restaurantes parceiros devidamente credenciados e entregadores autônomos parceiros.',
        },
      ],
    },
  });

  await prisma.cmsPage.upsert({
    where: { slug: 'politica-de-privacidade' },
    update: {},
    create: {
      slug: 'politica-de-privacidade',
      title: 'Política de Privacidade e Proteção de Dados (LGPD)',
      published: true,
      publishedAt: new Date(),
      sections: [
        {
          id: 'sec-hero-privacidade',
          type: 'hero',
          title: 'Política de Privacidade & LGPD',
          subtitle: 'Compromisso com a transparência, segurança cibernética e respeito absoluto aos seus dados pessoais.',
        },
        {
          id: 'sec-privacidade-content',
          type: 'text',
          title: 'Tratamento de Dados Pessoais',
          content: 'O iFastFood respeita a privacidade de todos os seus usuários. Coletamos apenas as informações estritamente necessárias para a prestação dos nossos serviços de entrega em conformidade com a Lei nº 13.709/2018 (LGPD). Todos os campos sensíveis são protegidos por criptografia AES-256.',
        },
      ],
    },
  });

  // 3. CATEGORIAS DE RESTAURANTES (MerchantCategory)
  console.log('3. Gravando Categorias de Parceiros...');
  const catPizza = await prisma.merchantCategory.upsert({
    where: { slug: 'pizzarias' },
    update: {},
    create: { id: 'cat-pizza', name: 'Pizzarias', slug: 'pizzarias' },
  });

  const catBurger = await prisma.merchantCategory.upsert({
    where: { slug: 'hamburguerias' },
    update: {},
    create: { id: 'cat-burger', name: 'Hamburguerias', slug: 'hamburguerias' },
  });

  const catSushi = await prisma.merchantCategory.upsert({
    where: { slug: 'japonesa' },
    update: {},
    create: { id: 'cat-sushi', name: 'Comida Japonesa & Sushi', slug: 'japonesa' },
  });

  const catSobremesa = await prisma.merchantCategory.upsert({
    where: { slug: 'sobremesas' },
    update: {},
    create: { id: 'cat-sobremesa', name: 'Doces & Sobremesas', slug: 'sobremesas' },
  });

  // 4. RESTAURANTES & CARDÁPIOS (Merchant)
  console.log('4. Gravando Restaurantes e Cardápios...');

  // Restaurante 1: Pizzaria Bella Napoli (ACTIVE)
  const merchBella = await prisma.merchant.upsert({
    where: { slug: 'bella-napoli' },
    update: {},
    create: {
      id: 'merch-bella-napoli',
      name: 'Pizzaria Bella Napoli',
      slug: 'bella-napoli',
      categoryId: catPizza.id,
      status: 'ACTIVE',
      documentEncrypted: '12.345.678/0001-90',
      email: 'contato@bellanapoli.com.br',
      phone: '+55 11 3255-8910',
      description: 'Pizzas artesanais napolitanas fermentadas por 48 horas em forno a lenha.',
      street: 'Rua Augusta',
      number: '1420',
      district: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01305-100',
      lat: -23.556200,
      lng: -46.660100,
      ratingAvg: 4.90,
      ratingCount: 342,
      orderPrepMinutes: 25,
      contract: {
        create: {
          plan: 'BASIC',
          commissionBps: 1200, // 12%
          onlinePaymentFeeBps: 399,
          monthlyFeeCents: 0,
          feeFreeThresholdCents: 0,
          commissionBasis: 'ITEMS',
        },
      },
      hours: {
        createMany: {
          data: [
            { weekday: 0, openMinutes: 660, closeMinutes: 1410 },
            { weekday: 1, openMinutes: 660, closeMinutes: 1410 },
            { weekday: 2, openMinutes: 660, closeMinutes: 1410 },
            { weekday: 3, openMinutes: 660, closeMinutes: 1410 },
            { weekday: 4, openMinutes: 660, closeMinutes: 1410 },
            { weekday: 5, openMinutes: 660, closeMinutes: 1410 },
            { weekday: 6, openMinutes: 660, closeMinutes: 1410 },
          ],
        },
      },
      zones: {
        create: {
          name: 'Raio Principal 7km',
          type: 'RADIUS',
          baseFeeCents: 590,
          perKmCents: 150,
          minFeeCents: 590,
          maxKm: 7.0,
        },
      },
    },
  });

  // Cardápio Bella Napoli
  const catPizzas = await prisma.menuCategory.upsert({
    where: { id: 'mcat-pizzas-salgadas' },
    update: {},
    create: {
      id: 'mcat-pizzas-salgadas',
      merchantId: merchBella.id,
      name: 'Pizzas Tradicionais',
      position: 1,
    },
  });

  await prisma.product.upsert({
    where: { id: 'prod-margherita' },
    update: {},
    create: {
      id: 'prod-margherita',
      menuCategoryId: catPizzas.id,
      name: 'Pizza Margherita Especial',
      description: 'Molho de tomate San Marzano, mozzarella di bufala fresca, manjericão e azeite extravirgem.',
      basePriceCents: 4990,
      active: true,
      position: 1,
    },
  });

  await prisma.product.upsert({
    where: { id: 'prod-calabresa' },
    update: {},
    create: {
      id: 'prod-calabresa',
      menuCategoryId: catPizzas.id,
      name: 'Pizza Calabresa Artesanal',
      description: 'Calabresa curada fatiada fininha, cebola roxa caramelizada e azeitonas pretas.',
      basePriceCents: 5490,
      active: true,
      position: 2,
    },
  });

  // Restaurante 2: Burger Artesanal Prime (ACTIVE)
  const merchBurger = await prisma.merchant.upsert({
    where: { slug: 'burger-prime' },
    update: {},
    create: {
      id: 'merch-burger-prime',
      name: 'Burger Artesanal Prime',
      slug: 'burger-prime',
      categoryId: catBurger.id,
      status: 'ACTIVE',
      documentEncrypted: '98.765.432/0001-11',
      email: 'contato@burgerprime.com.br',
      phone: '+55 11 3144-2200',
      description: 'Smash burgers feitos com blend 100% angus, pão brioche amanteigado e batatas rústicas.',
      street: 'Alameda Santos',
      number: '800',
      district: 'Cerqueira César',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01418-100',
      lat: -23.568400,
      lng: -46.651200,
      ratingAvg: 4.85,
      ratingCount: 285,
      orderPrepMinutes: 20,
      contract: {
        create: {
          plan: 'DELIVERY',
          commissionBps: 2300, // 23%
          onlinePaymentFeeBps: 399,
          monthlyFeeCents: 10000,
          feeFreeThresholdCents: 0,
          commissionBasis: 'ITEMS_AND_DELIVERY',
        },
      },
      hours: {
        createMany: {
          data: [
            { weekday: 0, openMinutes: 660, closeMinutes: 1380 },
            { weekday: 1, openMinutes: 660, closeMinutes: 1380 },
            { weekday: 2, openMinutes: 660, closeMinutes: 1380 },
            { weekday: 3, openMinutes: 660, closeMinutes: 1380 },
            { weekday: 4, openMinutes: 660, closeMinutes: 1380 },
            { weekday: 5, openMinutes: 660, closeMinutes: 1380 },
            { weekday: 6, openMinutes: 660, closeMinutes: 1380 },
          ],
        },
      },
      zones: {
        create: {
          name: 'Raio Express 5km',
          type: 'RADIUS',
          baseFeeCents: 650,
          perKmCents: 180,
          minFeeCents: 650,
          maxKm: 5.0,
        },
      },
    },
  });

  const catBurgers = await prisma.menuCategory.upsert({
    where: { id: 'mcat-burgers' },
    update: {},
    create: {
      id: 'mcat-burgers',
      merchantId: merchBurger.id,
      name: 'Smash Burgers',
      position: 1,
    },
  });

  await prisma.product.upsert({
    where: { id: 'prod-smash-bacon' },
    update: {},
    create: {
      id: 'prod-smash-bacon',
      menuCategoryId: catBurgers.id,
      name: 'Smash Duplo Bacon Burger',
      description: '2x carnes 90g ultra prensadas, cheddar inglês cremoso, fatias de bacon crocante e maionese defumada.',
      basePriceCents: 3490,
      active: true,
      position: 1,
    },
  });

  // Restaurante 3: Sushi House Oriental (PENDING_REVIEW - Fila KYC)
  const merchSushi = await prisma.merchant.upsert({
    where: { slug: 'sushi-house' },
    update: {},
    create: {
      id: 'merch-sushi-house',
      name: 'Sushi House Oriental',
      slug: 'sushi-house',
      categoryId: catSushi.id,
      status: 'PENDING_REVIEW',
      documentEncrypted: '45.678.901/0001-22',
      email: 'contato@sushihouse.com.br',
      phone: '+55 11 3812-4455',
      street: 'Rua dos Pinheiros',
      number: '340',
      district: 'Pinheiros',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '05422-000',
      lat: -23.567800,
      lng: -46.685400,
      documents: {
        createMany: {
          data: [
            { type: 'CNPJ_CARD', fileUrl: 'https://docs.ifastfood.com/kyc/cnpj-sushi.pdf', status: 'PENDING' },
            { type: 'SOCIAL_CONTRACT', fileUrl: 'https://docs.ifastfood.com/kyc/contrato-sushi.pdf', status: 'PENDING' },
          ],
        },
      },
    },
  });

  // Restaurante 4: Padaria Central (PENDING_REVIEW - Fila KYC)
  await prisma.merchant.upsert({
    where: { slug: 'padaria-central' },
    update: {},
    create: {
      id: 'merch-padaria-central',
      name: 'Padaria & Confeitaria Central',
      slug: 'padaria-central',
      categoryId: catSobremesa.id,
      status: 'PENDING_REVIEW',
      documentEncrypted: '56.789.012/0001-33',
      email: 'padaria.central@gmail.com',
      phone: '+55 11 3105-9988',
      street: 'Av. Brigadeiro Luís Antônio',
      number: '2100',
      district: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01318-002',
      lat: -23.561100,
      lng: -46.649900,
      documents: {
        create: {
          type: 'CNPJ_CARD',
          fileUrl: 'https://docs.ifastfood.com/kyc/cnpj-padaria.pdf',
          status: 'PENDING',
        },
      },
    },
  });

  // 5. USUÁRIOS & ENTREGADORES (Courier)
  console.log('5. Gravando Entregadores...');

  // Entregador 1: Carlos Silva (APPROVED & Em Turno)
  const userCarlos = await prisma.user.upsert({
    where: { email: 'carlos.silva@ifastfood.com.br' },
    update: {},
    create: {
      id: 'user-courier-carlos',
      email: 'carlos.silva@ifastfood.com.br',
      phone: '+5511988887771',
      name: 'Carlos Eduardo Silva',
      userType: 'COURIER',
      status: 'ACTIVE',
    },
  });

  const courierCarlos = await prisma.courier.upsert({
    where: { userId: userCarlos.id },
    update: {},
    create: {
      id: 'courier-carlos-1',
      userId: userCarlos.id,
      status: 'APPROVED',
      vehicleType: 'MOTORCYCLE',
      plate: 'BRA-2E19',
      ratingAvg: 4.95,
      ratingCount: 189,
      shifts: {
        create: {
          startedAt: new Date(),
        },
      },
      locations: {
        create: {
          lat: -23.550500,
          lng: -46.633300,
          onDelivery: false,
        },
      },
      documents: {
        createMany: {
          data: [
            { type: 'CNH', fileUrl: 'https://docs.ifastfood.com/kyc/cnh-carlos.pdf', status: 'APPROVED' },
            { type: 'CRLV', fileUrl: 'https://docs.ifastfood.com/kyc/crlv-carlos.pdf', status: 'APPROVED' },
          ],
        },
      },
    },
  });

  // Entregador 2: Marcos Santos (APPROVED)
  const userMarcos = await prisma.user.upsert({
    where: { email: 'marcos.santos@ifastfood.com.br' },
    update: {},
    create: {
      id: 'user-courier-marcos',
      email: 'marcos.santos@ifastfood.com.br',
      phone: '+5511988887772',
      name: 'Marcos Vinicius Santos',
      userType: 'COURIER',
      status: 'ACTIVE',
    },
  });

  const courierMarcos = await prisma.courier.upsert({
    where: { userId: userMarcos.id },
    update: {},
    create: {
      id: 'courier-marcos-2',
      userId: userMarcos.id,
      status: 'APPROVED',
      vehicleType: 'BICYCLE',
      ratingAvg: 4.88,
      ratingCount: 94,
      documents: {
        create: {
          type: 'CNH',
          fileUrl: 'https://docs.ifastfood.com/kyc/cnh-marcos.pdf',
          status: 'APPROVED',
        },
      },
    },
  });

  // Entregador 3: Lucas Rocha (PENDING_REVIEW - Fila KYC)
  const userLucas = await prisma.user.upsert({
    where: { email: 'lucas.rocha@ifastfood.com.br' },
    update: {},
    create: {
      id: 'user-courier-lucas',
      email: 'lucas.rocha@ifastfood.com.br',
      phone: '+5511988887773',
      name: 'Lucas Oliveira Rocha',
      userType: 'COURIER',
      status: 'ACTIVE',
    },
  });

  await prisma.courier.upsert({
    where: { userId: userLucas.id },
    update: {},
    create: {
      id: 'courier-lucas-3',
      userId: userLucas.id,
      status: 'PENDING_REVIEW',
      vehicleType: 'MOTORCYCLE',
      plate: 'SPX-9F31',
      documents: {
        createMany: {
          data: [
            { type: 'CNH', fileUrl: 'https://docs.ifastfood.com/kyc/cnh-lucas.pdf', status: 'PENDING' },
            { type: 'SELFIE', fileUrl: 'https://docs.ifastfood.com/kyc/selfie-lucas.jpg', status: 'PENDING' },
          ],
        },
      },
    },
  });

  // 6. CLIENTES (Customer) & ENDEREÇOS
  console.log('6. Gravando Clientes...');
  const userAna = await prisma.user.upsert({
    where: { email: 'ana.souza@email.com' },
    update: {},
    create: {
      id: 'user-cust-ana',
      email: 'ana.souza@email.com',
      phone: '+5511977776661',
      name: 'Ana Clara Souza',
      userType: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });

  const custAna = await prisma.customer.upsert({
    where: { userId: userAna.id },
    update: {},
    create: {
      id: 'cust-ana-1',
      userId: userAna.id,
      loyaltyPoints: 350,
      addresses: {
        create: {
          id: 'addr-ana-1',
          label: 'Apartamento',
          street: 'Av. Paulista',
          number: '1000',
          complement: 'Apt 84',
          district: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          lat: -23.563200,
          lng: -46.654200,
          isDefault: true,
        },
      },
    },
    include: { addresses: true },
  });

  // 7. CONTAS DO PLANO CONTÁBIL (LedgerAccount)
  console.log('7. Gravando Contas Contábeis...');
  const accGateway = await prisma.ledgerAccount.upsert({
    where: { code: '1001' },
    update: {},
    create: { code: '1001', name: 'Gateway Stripe Clearing (Ativo)', type: LedgerAccountType.ASSET },
  });

  const accMerchantPayable = await prisma.ledgerAccount.upsert({
    where: { code: '2001' },
    update: {},
    create: { code: '2001', name: 'Repasse Lojista a Pagar (Passivo)', type: LedgerAccountType.LIABILITY },
  });

  const accCourierPayable = await prisma.ledgerAccount.upsert({
    where: { code: '2002' },
    update: {},
    create: { code: '2002', name: 'Repasse Entregador a Pagar (Passivo)', type: LedgerAccountType.LIABILITY },
  });

  const accCommissionRevenue = await prisma.ledgerAccount.upsert({
    where: { code: '4001' },
    update: {},
    create: { code: '4001', name: 'Receita de Comissão (Receita)', type: LedgerAccountType.REVENUE },
  });

  const accServiceFeeRevenue = await prisma.ledgerAccount.upsert({
    where: { code: '4002' },
    update: {},
    create: { code: '4002', name: 'Taxa de Serviço da Plataforma (Receita)', type: LedgerAccountType.REVENUE },
  });

  // 8. PEDIDOS ENTREGUES & LANÇAMENTOS DO LEDGER (Order, Delivery, Payment, LedgerEntry)
  console.log('8. Gravando Pedidos Reais e Partidas Dobradas...');

  // Pedido 1: Bella Napoli -> Ana Clara (DELIVERED)
  const order1 = await prisma.order.upsert({
    where: { code: 'IF-9812A' },
    update: {},
    create: {
      id: 'ord-seed-1',
      code: 'IF-9812A',
      customerId: custAna.id,
      merchantId: merchBella.id,
      deliveryAddressId: custAna.addresses[0]?.id,
      status: 'DELIVERED',
      itemsTotalCents: 5490, // Pizza Calabresa
      deliveryFeeCents: 590,
      serviceFeeCents: 199,
      totalCents: 6279,
      paymentMethod: 'CARD_CREDIT',
      paymentMode: 'PLATFORM',
      contractCommissionBps: 1200, // 12%
      contractOnlinePaymentFeeBps: 399,
      contractCommissionBasis: 'ITEMS',
      commissionCents: 659,
      processingFeeCents: 160,
      placedAt: new Date(Date.now() - 3600 * 2000),
      deliveredAt: new Date(Date.now() - 3600 * 1000),
      delivery: {
        create: {
          courierId: courierCarlos.id,
          status: 'DELIVERED',
          feeCourierCents: 590,
          distanceKm: 2.8,
          deliveredAt: new Date(Date.now() - 3600 * 1000),
        },
      },
      items: {
        create: [
          {
            productId: 'prod-calabresa',
            productName: 'Pizza Calabresa Artesanal',
            unitPriceCents: 5490,
            quantity: 1,
            itemTotalCents: 5490,
          },
        ],
      },
      payment: {
        create: {
          method: 'CARD_CREDIT',
          gateway: 'STRIPE',
          status: 'PAID',
          amountCents: 6279,
          externalId: 'pi_seed_stripe_001',
          paidAt: new Date(Date.now() - 3600 * 2000),
        },
      },
    },
  });

  // Partidas dobradas do Pedido 1:
  // Débito: Gateway Clearing (6279)
  // Créditos: MerchantNet (4671) + Comissão (659) + Taxas Plataforma (359) + Entregador (590) = 6279
  const mNet1 = 5490 - 659 - 160;
  await prisma.ledgerEntry.createMany({
    data: [
      {
        accountId: accGateway.id,
        side: LedgerSide.DEBIT,
        amountCents: 6279,
        refType: 'ORDER',
        refId: order1.id,
        memo: 'Liquidação Stripe Pedido IF-9812A',
      },
      {
        accountId: accMerchantPayable.id,
        side: LedgerSide.CREDIT,
        amountCents: mNet1,
        refType: 'ORDER',
        refId: order1.id,
        memo: 'Crédito Líquido Bella Napoli IF-9812A',
      },
      {
        accountId: accCommissionRevenue.id,
        side: LedgerSide.CREDIT,
        amountCents: 659,
        refType: 'ORDER',
        refId: order1.id,
        memo: 'Comissão 12% Pedido IF-9812A',
      },
      {
        accountId: accServiceFeeRevenue.id,
        side: LedgerSide.CREDIT,
        amountCents: 199 + 160,
        refType: 'ORDER',
        refId: order1.id,
        memo: 'Taxa de Serviço + Processamento IF-9812A',
      },
      {
        accountId: accCourierPayable.id,
        side: LedgerSide.CREDIT,
        amountCents: 590,
        refType: 'ORDER',
        refId: order1.id,
        memo: 'Repasse de Entrega Carlos Silva IF-9812A',
      },
    ],
  });

  // Pedido 2: Burger Prime -> Ana Clara (DELIVERED)
  const order2 = await prisma.order.upsert({
    where: { code: 'IF-7721B' },
    update: {},
    create: {
      id: 'ord-seed-2',
      code: 'IF-7721B',
      customerId: custAna.id,
      merchantId: merchBurger.id,
      deliveryAddressId: custAna.addresses[0]?.id,
      status: 'DELIVERED',
      itemsTotalCents: 5180, // Smash Duplo + Batata
      deliveryFeeCents: 650,
      serviceFeeCents: 199,
      totalCents: 6029,
      paymentMethod: 'CARD_CREDIT',
      paymentMode: 'PLATFORM',
      contractCommissionBps: 2300, // 23%
      contractOnlinePaymentFeeBps: 399,
      contractCommissionBasis: 'ITEMS_AND_DELIVERY',
      commissionCents: 1386,
      processingFeeCents: 160,
      placedAt: new Date(Date.now() - 3600 * 5000),
      deliveredAt: new Date(Date.now() - 3600 * 4000),
      delivery: {
        create: {
          courierId: courierMarcos.id,
          status: 'DELIVERED',
          feeCourierCents: 650,
          distanceKm: 3.5,
          deliveredAt: new Date(Date.now() - 3600 * 4000),
        },
      },
      items: {
        create: [
          {
            productId: 'prod-smash-bacon',
            productName: 'Smash Duplo Bacon Burger',
            unitPriceCents: 3490,
            quantity: 1,
            itemTotalCents: 3490,
          },
        ],
      },
      payment: {
        create: {
          method: 'CARD_CREDIT',
          gateway: 'STRIPE',
          status: 'PAID',
          amountCents: 6029,
          externalId: 'pi_seed_stripe_002',
          paidAt: new Date(Date.now() - 3600 * 5000),
        },
      },
    },
  });

  // Partidas dobradas do Pedido 2:
  const mNet2 = 5180 - 1386 - 160;
  await prisma.ledgerEntry.createMany({
    data: [
      {
        accountId: accGateway.id,
        side: LedgerSide.DEBIT,
        amountCents: 6029,
        refType: 'ORDER',
        refId: order2.id,
        memo: 'Liquidação Stripe Pedido IF-7721B',
      },
      {
        accountId: accMerchantPayable.id,
        side: LedgerSide.CREDIT,
        amountCents: mNet2,
        refType: 'ORDER',
        refId: order2.id,
        memo: 'Crédito Líquido Burger Prime IF-7721B',
      },
      {
        accountId: accCommissionRevenue.id,
        side: LedgerSide.CREDIT,
        amountCents: 1386,
        refType: 'ORDER',
        refId: order2.id,
        memo: 'Comissão 23% Pedido IF-7721B',
      },
      {
        accountId: accServiceFeeRevenue.id,
        side: LedgerSide.CREDIT,
        amountCents: 199 + 160,
        refType: 'ORDER',
        refId: order2.id,
        memo: 'Taxa de Serviço + Processamento IF-7721B',
      },
      {
        accountId: accCourierPayable.id,
        side: LedgerSide.CREDIT,
        amountCents: 650,
        refType: 'ORDER',
        refId: order2.id,
        memo: 'Repasse de Entrega Marcos Santos IF-7721B',
      },
    ],
  });

  // 9. CUPONS DE DESCONTO (Coupon)
  console.log('9. Gravando Cupons...');
  await prisma.coupon.upsert({
    where: { code: 'BEMVINDO10' },
    update: {},
    create: {
      code: 'BEMVINDO10',
      type: 'PERCENTAGE',
      percentOff: 10,
      minOrderCents: 3000,
      maxDiscountCents: 1500,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 86400 * 1000),
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'PRIMEIRACOMPRA' },
    update: {},
    create: {
      code: 'PRIMEIRACOMPRA',
      type: 'FIXED',
      amountOffCents: 1500,
      minOrderCents: 4000,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 86400 * 1000),
    },
  });

  // 10. AVALIAÇÕES REAIS (Rating)
  console.log('10. Gravando Avaliações...');
  await prisma.rating.upsert({
    where: { orderId: order1.id },
    update: {},
    create: {
      orderId: order1.id,
      merchantRating: 5,
      courierRating: 5,
      comment: 'Melhor pizza napolitana da cidade! Massa super leve e entrega rápida.',
    },
  });

  // 11. SESSÕES E REFRESH TOKENS (Session, RefreshToken)
  console.log('11. Gravando Sessões e Refresh Tokens (Session, RefreshToken)...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ifastfood.com.br' },
    update: {},
    create: {
      id: 'user-admin-master',
      email: 'admin@ifastfood.com.br',
      phone: '+5511999990000',
      name: 'Administrador iFastFood',
      userType: 'STAFF',
      status: 'ACTIVE',
    },
  });

  const session1 = await prisma.session.upsert({
    where: { id: 'sess-admin-master' },
    update: {},
    create: {
      id: 'sess-admin-master',
      userId: adminUser.id,
      familyId: 'fam-sess-admin-01',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ip: '127.0.0.1',
      expiresAt: new Date(Date.now() + 30 * 86400 * 1000),
    },
  });

  await prisma.refreshToken.upsert({
    where: { id: 'rt-admin-master' },
    update: {},
    create: {
      id: 'rt-admin-master',
      sessionId: session1.id,
      tokenHash: 'hash_sha256_rt_admin_master_001_seeded',
      expiresAt: new Date(Date.now() + 30 * 86400 * 1000),
    },
  });

  // 12. CARTEIRA E TRANSAÇÕES (Wallet, WalletTransaction)
  console.log('12. Gravando Carteiras e Transações (Wallet, WalletTransaction)...');
  const walletAna = await prisma.wallet.upsert({
    where: { customerId: custAna.id },
    update: {},
    create: {
      id: 'wallet-cust-ana',
      customerId: custAna.id,
      balanceCents: 2500,
    },
  });

  await prisma.walletTransaction.upsert({
    where: { id: 'wtx-cashback-001' },
    update: {},
    create: {
      id: 'wtx-cashback-001',
      walletId: walletAna.id,
      type: 'CREDIT',
      amountCents: 2500,
      reason: 'Cashback Promocional de Boas-Vindas iFastFood',
      relatedOrderId: order1.id,
    },
  });

  // 13. PLANOS DE ASSINATURA E ASSINATURAS DE CLIENTES (SubscriptionPlan, CustomerSubscription)
  console.log('13. Gravando Planos e Assinaturas (SubscriptionPlan, CustomerSubscription)...');
  const planPrime = await prisma.subscriptionPlan.upsert({
    where: { slug: 'ifastfood-prime' },
    update: {},
    create: {
      id: 'plan-prime-vip',
      name: 'iFastFood Prime',
      slug: 'ifastfood-prime',
      priceCents: 1990,
      perks: {
        freeDeliveryMinCents: 3500,
        exclusiveDiscountsPercent: 15,
        prioritySupport: true,
      },
      active: true,
    },
  });

  await prisma.customerSubscription.upsert({
    where: { id: 'sub-ana-prime' },
    update: {},
    create: {
      id: 'sub-ana-prime',
      customerId: custAna.id,
      planId: planPrime.id,
      status: 'ACTIVE',
      startedAt: new Date(Date.now() - 15 * 86400 * 1000),
      nextBillingAt: new Date(Date.now() + 15 * 86400 * 1000),
      gateway: 'STRIPE',
      externalId: 'sub_stripe_prime_ana_123',
    },
  });

  // 14. EQUIPE DO PARCEIRO (MerchantStaff)
  console.log('14. Gravando Equipe de Lojistas (MerchantStaff)...');
  const userGerenteBella = await prisma.user.upsert({
    where: { email: 'gerente@bellanapoli.com.br' },
    update: {},
    create: {
      id: 'user-staff-bella',
      email: 'gerente@bellanapoli.com.br',
      phone: '+5511999991122',
      name: 'Fabio Bertolucci (Gerente)',
      userType: 'MERCHANT_STAFF',
      status: 'ACTIVE',
    },
  });

  await prisma.merchantStaff.upsert({
    where: {
      merchantId_userId: {
        merchantId: merchBella.id,
        userId: userGerenteBella.id,
      },
    },
    update: {},
    create: {
      id: 'staff-bella-01',
      merchantId: merchBella.id,
      userId: userGerenteBella.id,
      role: 'MANAGER',
    },
  });

  // 15. GRUPOS DE OPCIONAIS E ITENS (ProductOptionGroup, ProductOption)
  console.log('15. Gravando Grupos de Opcionais (ProductOptionGroup, ProductOption)...');
  const pogBorda = await prisma.productOptionGroup.upsert({
    where: { id: 'pog-margherita-borda' },
    update: {},
    create: {
      id: 'pog-margherita-borda',
      productId: 'prod-margherita',
      name: 'Escolha a Borda Recheada',
      minSelect: 0,
      maxSelect: 1,
      required: false,
      position: 1,
    },
  });

  await prisma.productOption.upsert({
    where: { id: 'opt-catupiry' },
    update: {},
    create: {
      id: 'opt-catupiry',
      groupId: pogBorda.id,
      name: 'Catupiry Original',
      priceDeltaCents: 600,
      active: true,
      position: 1,
    },
  });

  await prisma.productOption.upsert({
    where: { id: 'opt-cheddar' },
    update: {},
    create: {
      id: 'opt-cheddar',
      groupId: pogBorda.id,
      name: 'Cheddar Cremoso',
      priceDeltaCents: 600,
      active: true,
      position: 2,
    },
  });

  const pogPontoCarne = await prisma.productOptionGroup.upsert({
    where: { id: 'pog-calabresa-tipo' },
    update: {},
    create: {
      id: 'pog-calabresa-tipo',
      productId: 'prod-calabresa',
      name: 'Preparo da Cebola',
      minSelect: 1,
      maxSelect: 1,
      required: true,
      position: 1,
    },
  });

  await prisma.productOption.upsert({
    where: { id: 'opt-cebola-caramelizada' },
    update: {},
    create: {
      id: 'opt-cebola-caramelizada',
      groupId: pogPontoCarne.id,
      name: 'Cebola Roxa Caramelizada',
      priceDeltaCents: 0,
      active: true,
      position: 1,
    },
  });

  await prisma.productOption.upsert({
    where: { id: 'opt-sem-cebola' },
    update: {},
    create: {
      id: 'opt-sem-cebola',
      groupId: pogPontoCarne.id,
      name: 'Sem Cebola',
      priceDeltaCents: 0,
      active: true,
      position: 2,
    },
  });

  // 16. RESGATES DE CUPONS (CouponRedemption)
  console.log('16. Gravando Resgates de Cupom (CouponRedemption)...');
  const couponBemVindo = await prisma.coupon.findUnique({ where: { code: 'BEMVINDO10' } });
  if (couponBemVindo) {
    await prisma.couponRedemption.upsert({
      where: {
        couponId_orderId: {
          couponId: couponBemVindo.id,
          orderId: order1.id,
        },
      },
      update: {},
      create: {
        id: 'redemption-ord1',
        couponId: couponBemVindo.id,
        orderId: order1.id,
        customerId: custAna.id,
        discountCents: 549,
      },
    });
  }

  // 17. OPCIONAIS ESCOLHIDOS NO PEDIDO (OrderItemOption)
  console.log('17. Gravando Opcionais do Item do Pedido (OrderItemOption)...');
  const order1Item = await prisma.orderItem.findFirst({
    where: { orderId: order1.id },
  });
  if (order1Item) {
    await prisma.orderItemOption.upsert({
      where: { id: 'itemopt-ord1-borda' },
      update: {},
      create: {
        id: 'itemopt-ord1-borda',
        orderItemId: order1Item.id,
        groupName: 'Escolha a Borda Recheada',
        optionName: 'Catupiry Original',
        priceDeltaCents: 600,
      },
    });
  }

  // 18. TRILHA DE EVENTOS DE ESTADO DO PEDIDO (OrderEventOrderState)
  console.log('18. Gravando Trilha de Eventos do Pedido (OrderEventOrderState)...');
  const eventCount = await prisma.orderEventOrderState.count({ where: { orderId: order1.id } });
  if (eventCount === 0) {
    await prisma.orderEventOrderState.createMany({
      data: [
        {
          orderId: order1.id,
          fromStatus: null,
          toStatus: 'CREATED',
          actorType: 'CUSTOMER',
          actorUserId: userAna.id,
          payload: { source: 'WEB_CHECKOUT' },
          createdAt: new Date(Date.now() - 3600 * 2000),
        },
        {
          orderId: order1.id,
          fromStatus: 'CREATED',
          toStatus: 'CONFIRMED',
          actorType: 'MERCHANT',
          actorUserId: userGerenteBella.id,
          payload: { autoAccept: true },
          createdAt: new Date(Date.now() - 3500 * 2000),
        },
        {
          orderId: order1.id,
          fromStatus: 'CONFIRMED',
          toStatus: 'PREPARING',
          actorType: 'MERCHANT',
          createdAt: new Date(Date.now() - 3300 * 2000),
        },
        {
          orderId: order1.id,
          fromStatus: 'PREPARING',
          toStatus: 'READY',
          actorType: 'MERCHANT',
          createdAt: new Date(Date.now() - 2500 * 2000),
        },
        {
          orderId: order1.id,
          fromStatus: 'READY',
          toStatus: 'DISPATCHED',
          actorType: 'COURIER',
          actorUserId: userCarlos.id,
          createdAt: new Date(Date.now() - 2000 * 2000),
        },
        {
          orderId: order1.id,
          fromStatus: 'DISPATCHED',
          toStatus: 'DELIVERED',
          actorType: 'COURIER',
          actorUserId: userCarlos.id,
          payload: { pinValidated: true, pin: '7492' },
          createdAt: new Date(Date.now() - 3600 * 1000),
        },
      ],
    });
  }

  // 19. REEMBOLSOS (Refund)
  console.log('19. Gravando Reembolsos e Ajustes (Refund)...');
  const payment2 = await prisma.payment.findUnique({
    where: { orderId: order2.id },
  });
  if (payment2) {
    await prisma.refund.upsert({
      where: { id: 'ref-seed-001' },
      update: {},
      create: {
        id: 'ref-seed-001',
        paymentId: payment2.id,
        amountCents: 500,
        reason: 'Compensação por atraso moderado na cozinha',
        status: 'COMPLETED',
        externalId: 're_stripe_seed_test_500',
        completedAt: new Date(Date.now() - 1800 * 1000),
      },
    });
  }

  // 20. LOTES DE REPASSE E ITENS CONCILIADOS (Payout, PayoutItem)
  console.log('20. Gravando Lotes de Repasse (Payout, PayoutItem)...');
  await prisma.payout.upsert({
    where: {
      merchantId_periodStart_periodEnd: {
        merchantId: merchBella.id,
        periodStart: new Date('2026-11-01T00:00:00Z'),
        periodEnd: new Date('2026-11-07T23:59:59Z'),
      },
    },
    update: {},
    create: {
      id: 'payout-bella-001',
      merchantId: merchBella.id,
      periodStart: new Date('2026-11-01T00:00:00Z'),
      periodEnd: new Date('2026-11-07T23:59:59Z'),
      grossCents: 5490,
      commissionCents: 659,
      processingFeeCents: 160,
      monthlyFeeCents: 0,
      netCents: 4671,
      status: 'PAID',
      externalId: 'po_stripe_bella_nov_w1',
      paidAt: new Date('2026-11-08T12:00:00Z'),
      items: {
        create: {
          id: 'poi-bella-001',
          orderId: order1.id,
          orderItemsCents: 5490,
          orderDeliveryCents: 0,
          commissionCents: 659,
          processingFeeCents: 160,
          netCents: 4671,
        },
      },
    },
  });

  // 21. FATURAS MENSAIS (Invoice)
  console.log('21. Gravando Faturas Mensais (Invoice)...');
  await prisma.invoice.upsert({
    where: { id: 'inv-burger-nov-2026' },
    update: {},
    create: {
      id: 'inv-burger-nov-2026',
      merchantId: merchBurger.id,
      type: 'MONTHLY_FEE',
      periodStart: new Date('2026-11-01T00:00:00Z'),
      periodEnd: new Date('2026-11-30T23:59:59Z'),
      amountCents: 10000,
      status: 'PAID',
      issuedAt: new Date('2026-11-01T08:00:00Z'),
      paidAt: new Date('2026-11-05T14:30:00Z'),
    },
  });

  // 22. CHAMADOS E MENSAGENS DE SUPORTE (SupportTicket, TicketMessage)
  console.log('22. Gravando Chamados de Suporte (SupportTicket, TicketMessage)...');
  await prisma.supportTicket.upsert({
    where: { id: 'ticket-cust-cupom' },
    update: {},
    create: {
      id: 'ticket-cust-cupom',
      persona: 'CUSTOMER',
      subject: 'Dúvida sobre cupom PRIMEIRACOMPRA e pagamento via PIX',
      userId: userAna.id,
      orderId: order1.id,
      status: 'RESOLVED',
      priority: 'NORMAL',
      resolvedAt: new Date(),
      messages: {
        createMany: {
          data: [
            {
              id: 'msg-ticket-1-01',
              authorUserId: userAna.id,
              authorType: 'CUSTOMER',
              body: 'Olá! Gostaria de saber se o cupom PRIMEIRACOMPRA pode ser combinado com pagamento por PIX no checkout.',
              internal: false,
            },
            {
              id: 'msg-ticket-1-02',
              authorUserId: adminUser.id,
              authorType: 'STAFF',
              body: 'Olá Ana! Sim, os cupons são válidos para todas as modalidades de pagamento online (PIX e Cartão de Crédito). Aproveite!',
              internal: false,
            },
          ],
        },
      },
    },
  });

  const userGerenteBellaRef = await prisma.user.findUnique({ where: { email: 'gerente@bellanapoli.com.br' } });
  if (userGerenteBellaRef) {
    await prisma.supportTicket.upsert({
      where: { id: 'ticket-merch-raio' },
      update: {},
      create: {
        id: 'ticket-merch-raio',
        persona: 'MERCHANT',
        subject: 'Expansão de raio de atendimento para finais de semana',
        userId: userGerenteBellaRef.id,
        merchantId: merchBella.id,
        status: 'OPEN',
        priority: 'HIGH',
        messages: {
          create: {
            id: 'msg-ticket-2-01',
            authorUserId: userGerenteBellaRef.id,
            authorType: 'MERCHANT',
            body: 'Gostaríamos de expandir nosso raio de entrega para 8.5 km às sextas e sábados à noite.',
            internal: false,
          },
        },
      },
    });
  }

  // 23. NOTIFICAÇÕES (Notification)
  console.log('23. Gravando Notificações (Notification)...');
  await prisma.notification.upsert({
    where: { id: 'notif-ana-pedido-entregue' },
    update: {},
    create: {
      id: 'notif-ana-pedido-entregue',
      userId: userAna.id,
      channel: 'PUSH',
      title: 'Seu pedido foi entregue!',
      body: 'Carlos Eduardo entregou sua Pizza Calabresa Artesanal. Bom apetite!',
      sentAt: new Date(Date.now() - 3600 * 1000),
      readAt: new Date(Date.now() - 3500 * 1000),
      payload: { orderId: order1.id, code: 'IF-9812A' },
    },
  });

  await prisma.notification.upsert({
    where: { id: 'notif-carlos-gorjeta' },
    update: {},
    create: {
      id: 'notif-carlos-gorjeta',
      userId: userCarlos.id,
      channel: 'PUSH',
      title: 'Entrega finalizada com sucesso!',
      body: 'Você recebeu R$ 5,90 pela entrega do pedido IF-9812A.',
      sentAt: new Date(Date.now() - 3600 * 1000),
      readAt: new Date(Date.now() - 3550 * 1000),
      payload: { orderId: order1.id, feeCourierCents: 590 },
    },
  });

  // 24. EVENTOS DE WEBHOOK IDEMPOTENTES (WebhookEvent)
  console.log('24. Gravando Eventos de Webhook Idempotentes (WebhookEvent)...');
  await prisma.webhookEvent.upsert({
    where: {
      gateway_externalId: {
        gateway: 'STRIPE',
        externalId: 'evt_stripe_seed_order1_succeeded',
      },
    },
    update: {},
    create: {
      id: 'wh-seed-stripe-001',
      gateway: 'STRIPE',
      externalId: 'evt_stripe_seed_order1_succeeded',
      payload: {
        id: 'evt_stripe_seed_order1_succeeded',
        type: 'payment_intent.succeeded',
        created: Math.floor(Date.now() / 1000) - 7200,
        data: {
          object: {
            id: 'pi_seed_stripe_001',
            amount: 6279,
            currency: 'brl',
            status: 'succeeded',
          },
        },
      },
      processedAt: new Date(Date.now() - 3600 * 2000),
    },
  });

  console.log('--- Seed Completo no Supabase Finalizado com Sucesso! ---');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
