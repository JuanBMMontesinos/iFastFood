/**
 * Design tokens do iFastFood — fonte única para todas as superfícies.
 * Apps web importam este módulo TS; apps nativos (Kotlin/Swift)
 * leem `tokens.json` e geram Compose theme / SwiftUI Assets.
 */
import rawTokens from '../tokens.json';

export const tokens = rawTokens;
