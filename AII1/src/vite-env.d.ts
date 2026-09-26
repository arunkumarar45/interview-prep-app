/// <reference types="vite/client" />

// CSS module support — plain CSS imports are side-effects, not modules
declare module "*.css" {
  const content: string;
  export default content;
}

// Web Speech API — not in all TS dom.lib versions
// https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};
