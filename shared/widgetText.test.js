import test from 'node:test';
import assert from 'node:assert/strict';
import { widgetTextRuns } from './widgetText.js';
test('formatted text supports bold and italic while HTML remains literal text',()=>{
 assert.deepEqual(widgetTextRuns('Hello **team** and *friends* <script>'),[{text:'Hello ',format:'plain'},{text:'team',format:'bold'},{text:' and ',format:'plain'},{text:'friends',format:'italic'},{text:' <script>',format:'plain'}]);
});
