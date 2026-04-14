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
            const basePathVar =
              env === 'production'
                ? process.env.NEXT_PUBLIC_BASE_PATH_PROD
                : process.env.NEXT_PUBLIC_BASE_PATH_DEV;
            const basePath = (basePathVar || '/JSD/Digital/roadmapapp').replace(/\/$/, '');
            const iconHref = `${basePath || ''}/favicon.ico`;
            return (
              <link
                rel="icon"
                href={iconHref.startsWith('/') ? iconHref : `/${iconHref}`}
                sizes="any"
              />
            );
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
