import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="de">
        <Head>
          <meta charSet="utf-8" />
          {(() => {
            const env =
              process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || process.env.NODE_ENV || 'development';
            const devBase = (
              process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL_DEV ||
              'https://spi.intranet.bs.ch/JSD/Digital'
            ).replace(/\/$/, '');
            const prodBase = (process.env.NEXT_PUBLIC_SHAREPOINT_SITE_URL_PROD || devBase).replace(
              /\/$/,
              ''
            );
            const basePathVar =
              env === 'production'
                ? process.env.NEXT_PUBLIC_BASE_PATH_PROD
                : process.env.NEXT_PUBLIC_BASE_PATH_DEV;
            const basePath = (basePathVar || '/JSD/Digital/roadmapapp').replace(/\/$/, '');
            const site = env === 'production' ? prodBase : devBase;
            return <link rel="icon" href={`${site}${basePath}/favicon.ico`} sizes="any" />;
          })()}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
