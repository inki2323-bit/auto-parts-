const fs = require('fs');
const path = require('path');

describe('React Native app entry', () => {
  it('initializes react-native-gesture-handler before registering the app', () => {
    const entrySource = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
    expect(entrySource).toContain("import 'react-native-gesture-handler';");
  });
});
