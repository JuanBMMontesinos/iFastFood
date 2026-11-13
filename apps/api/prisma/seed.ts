import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Populando páginas CMS institucionais no banco de dados...');

  // 1. Sobre Nós
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

  // 2. Termos de Uso
  await prisma.cmsPage.upsert({
    where: { slug: 'termos-de-uso' },
    update: {},
    create: {
      slug: 'termos-de-uso',
      title: 'Termos e Condições de Uso',
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

  // 3. Política de Privacidade
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
          content: 'O iFastFood respeita a privacidade de todos os seus usuários. Coletamos apenas as informações estritamente necessárias para a prestação dos nossos serviços de entrega em conformidade com a Lei nº 13.709/2018 (LGPD).',
        },
      ],
    },
  });

  console.log('Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
