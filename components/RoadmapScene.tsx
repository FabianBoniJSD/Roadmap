import { useId } from 'react';

/** A conceptual project path, not a chart of live project data. */
export default function RoadmapScene() {
  const titleId = useId();
  return (
    <figure className="control-scene">
      <div className="control-scene-caption">
        <span>Von der Planung zur Umsetzung</span>
        <span>Schematische Projektphasen</span>
      </div>
      <svg viewBox="0 0 640 370" role="img" aria-labelledby={titleId}>
        <title id={titleId}>Ein Projektpfad verbindet Planung, Umsetzung und Abschluss.</title>
        <g className="control-scene-assembly">
          <path
            className="scene-base"
            d="M70 248 340 92 575 226 305 382Z"
            transform="translate(0 -34)"
          />
          <path className="scene-edge" d="m70 214 235 134 270-156v15L305 363 70 229Z" />
          <path className="scene-sheet" d="M70 192 340 36 575 170 305 326Z" />
          <g className="scene-grid">
            <path d="m125 223 270-156m-215 187 270-156m-215 187 270-156m-215 187 270-156" />
            <path d="m124 161 235 134m-181-165 235 134m-181-165 235 134m-181-165 235 134" />
          </g>
          <g className="scene-planned">
            <path d="m130 179 102-59 31 18-102 59Z" />
            <path d="m130 179 31 18v10l-31-18Zm31 18 102-59v10l-102 59Z" />
          </g>
          <g className="scene-active">
            <path className="scene-active-top" d="m244 175 116-67 31 18-116 67Z" />
            <path
              className="scene-active-side"
              d="m244 175 31 18v28l-31-18Zm31 18 116-67v28l-116 67Z"
            />
          </g>
          <g className="scene-complete">
            <path d="m368 172 97-56 31 18-97 56Z" />
            <path d="m368 172 31 18v42l-31-18Zm31 18 97-56v42l-97 56Z" />
          </g>
          <path className="scene-route" d="m145 238 78 44 68-39 51 29 82-47" />
          <g className="scene-nodes">
            <circle cx="145" cy="238" r="5" />
            <circle cx="291" cy="243" r="5" />
            <circle cx="424" cy="225" r="5" />
          </g>
          <g className="scene-marker">
            <path d="m336 68 13-8 13 8-13 8Z" />
            <path d="M349 76v31" />
          </g>
        </g>
      </svg>
      <figcaption className="control-scene-key">
        <span>Planung</span>
        <span>Umsetzung</span>
        <span>Abschluss</span>
      </figcaption>
    </figure>
  );
}
