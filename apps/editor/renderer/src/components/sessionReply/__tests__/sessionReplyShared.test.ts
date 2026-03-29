import assert from 'node:assert/strict';
import test from 'node:test';

import { focusReplyEditorAtEnd } from '../sessionReplyShared';

test('focusReplyEditorAtEnd focuses editor and places caret at document end', () => {
  let focused = false;
  let position: { lineNumber: number; column: number } | null = null;
  let revealed: { lineNumber: number; column: number } | null = null;

  const editor = {
    focus() {
      focused = true;
    },
    getModel() {
      return {
        getLineCount() {
          return 3;
        },
        getLineMaxColumn(lineNumber: number) {
          return lineNumber === 3 ? 12 : 1;
        },
      };
    },
    setPosition(nextPosition: { lineNumber: number; column: number }) {
      position = nextPosition;
    },
    revealPositionInCenterIfOutsideViewport(nextPosition: {
      lineNumber: number;
      column: number;
    }) {
      revealed = nextPosition;
    },
  };

  focusReplyEditorAtEnd(editor);

  assert.equal(focused, true);
  assert.deepEqual(position, { lineNumber: 3, column: 12 });
  assert.deepEqual(revealed, { lineNumber: 3, column: 12 });
});
