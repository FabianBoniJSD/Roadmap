import Document, { Html, Head, Main, NextScript } from 'next/document';
import { DEFAULT_COLOR_MODE, getColorModeInitScript } from '@/utils/colorMode';

class RoadmapDocument extends Document {
  render() {
    return (
      <Html lang="de" data-color-mode={DEFAULT_COLOR_MODE}>
        <Head>
          <meta charSet="utf-8" />
          <script dangerouslySetInnerHTML={{ __html: getColorModeInitScript() }} />
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
