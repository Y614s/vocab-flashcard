/**
 * 词汇导入脚本
 * 将JSON单词文件转换为应用所需的格式并生成vocab_library.js
 */

const fs = require('fs');
const path = require('path');

// 读取JSON文件
function loadJsonFile(filename) {
    const filepath = path.join(__dirname, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
}

// 转换单词格式
function convertWord(item) {
    // 原格式：{ word, translations: [{translation, type}], phrases?: [...] }
    // 目标格式：{ word, phonetic, definition, example, mnemonic, etymology }

    // 合并所有翻译
    const definitions = item.translations
        ? item.translations.map(t => `${t.type ? t.type + '. ' : ''}${t.translation}`).join('；')
        : '';

    // 取第一个短语作为例句
    let example = '';
    if (item.phrases && item.phrases.length > 0) {
        const phrase = item.phrases[0];
        example = `${phrase.phrase}：${phrase.translation}`;
    }

    return {
        word: item.word,
        phonetic: '',  // JSON中没有音标数据
        definition: definitions,
        example: example,
        mnemonic: '',
        etymology: ''
    };
}

// 主函数
function main() {
    console.log('开始导入单词...\n');

    // 加载三个词库文件
    const cet4Data = loadJsonFile('3-CET4-顺序.json');
    const cet6Data = loadJsonFile('4-CET6-顺序.json');
    const kaoyanData = loadJsonFile('5-考研-顺序.json');

    console.log(`CET4 原始单词数: ${cet4Data.length}`);
    console.log(`CET6 原始单词数: ${cet6Data.length}`);
    console.log(`考研 原始单词数: ${kaoyanData.length}`);

    // 转换格式
    const cet4Words = cet4Data.map(convertWord);
    const cet6Words = cet6Data.map(convertWord);
    const kaoyanWords = kaoyanData.map(convertWord);

    console.log(`\nCET4 转换后单词数: ${cet4Words.length}`);
    console.log(`CET6 转换后单词数: ${cet6Words.length}`);
    console.log(`考研 转换后单词数: ${kaoyanWords.length}`);

    // 生成新的vocab_library.js
    const output = `/**
 * 词库数据层 - 支持多词书
 * vocab_library.js
 * 自动生成于 ${new Date().toISOString()}
 */

// ========================================
// 词书元数据配置
// ========================================
const LibraryConfig = {
    cet4: {
        id: 'cet4',
        name: '大学英语四级',
        description: 'College English Test Band 4',
        totalWords: ${cet4Words.length},
        level: 'intermediate'
    },
    cet6: {
        id: 'cet6',
        name: '大学英语六级',
        description: 'College English Test Band 6',
        totalWords: ${cet6Words.length},
        level: 'advanced'
    },
    kaoyan: {
        id: 'kaoyan',
        name: '考研英语',
        description: 'Graduate Entrance Examination',
        totalWords: ${kaoyanWords.length},
        level: 'advanced'
    }
};

// ========================================
// CET4 词汇
// ========================================
const CET4_DATA = ${JSON.stringify(cet4Words, null, 4)};

// ========================================
// CET6 词汇
// ========================================
const CET6_DATA = ${JSON.stringify(cet6Words, null, 4)};

// ========================================
// 考研词汇
// ========================================
const KAOYAN_DATA = ${JSON.stringify(kaoyanWords, null, 4)};

// ========================================
// 获取词库接口
// ========================================
function getLibrary(bookId) {
    const libraries = {
        'cet4': CET4_DATA,
        'cet6': CET6_DATA,
        'kaoyan': KAOYAN_DATA
    };

    return libraries[bookId] || null;
}

function getLibraryConfig(bookId) {
    return LibraryConfig[bookId] || null;
}

function getAllLibraries() {
    return Object.values(LibraryConfig);
}

// ========================================
// 合并多个词库
// ========================================
function mergeLibraries(...bookIds) {
    let merged = [];
    for (const id of bookIds) {
        const lib = getLibrary(id);
        if (lib) {
            merged = [...merged, ...lib];
        }
    }
    return merged;
}

// 导出（如果使用 ES6 模块）
// export { LibraryConfig, CET4_DATA, CET6_DATA, KAOYAN_DATA, getLibrary, getLibraryConfig, getAllLibraries, mergeLibraries };
`;

    // 写入文件
    const outputPath = path.join(__dirname, 'vocab_library.js');
    fs.writeFileSync(outputPath, output, 'utf-8');

    console.log(`\n✅ 成功生成 vocab_library.js`);
    console.log(`   总单词数: ${cet4Words.length + cet6Words.length + kaoyanWords.length}`);
}

main();
