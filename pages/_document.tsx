import Document, { Html, Head, Main, NextScript } from 'next/document';

class RoadmapDocument extends Document {
  render() {
    return (
      <Html lang="de">
        <Head>
          <meta charSet="utf-8" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default RoadmapDocument;
