export type Language = 'Python' | 'JavaScript' | 'Java'

export type LineExplanation = {
  simple: string
  detail: string
  deep: string
  extension: string
}

export type Challenge = {
  id: string
  title: string
  prompt: string
  language: Language
  code: string[]
  explanations: LineExplanation[]
}

export const LANGUAGE_OPTIONS: Language[] = ['Python', 'JavaScript', 'Java']

function explain(summary: string): LineExplanation {
  return {
    simple: summary,
    detail: `${summary} 先看清输入、处理过程和这一行产生的结果。`,
    deep: `${summary} 再深入一步，要留意数据类型、边界情况以及是否会修改原数据。`,
    extension: '可以试着替换示例数据，观察结果如何变化，再把这段逻辑封装成函数。',
  }
}

function challenge(
  id: string,
  title: string,
  prompt: string,
  language: Language,
  code: string[],
  summaries: string[],
): Challenge {
  if (code.length !== summaries.length) {
    throw new Error(`${id} 的代码行与解释数量不一致`)
  }
  return {
    id,
    title,
    prompt,
    language,
    code,
    explanations: summaries.map(explain),
  }
}

export const challengesByLanguage: Record<Language, Challenge[]> = {
  Python: [
    challenge(
      'python-average',
      '及格分的平均值',
      '筛选及格分数，并计算平均值。',
      'Python',
      [
        'scores = [72, 88, 95, 61]',
        'passed = [score for score in scores if score >= 60]',
        'average = sum(passed) / len(passed)',
        'print(f"{average:.1f}")',
      ],
      [
        '创建列表，保存四个学生的成绩。',
        '列表推导式只保留大于等于 60 的成绩。',
        '用总分除以人数，得到平均分。',
        '把平均分保留一位小数并输出。',
      ],
    ),
    challenge(
      'python-longest',
      '找出最长的单词',
      '从列表中找到字符数量最多的单词。',
      'Python',
      [
        'words = ["why", "practice", "code"]',
        'longest = max(words, key=lambda word: len(word))',
        'print(longest)',
      ],
      ['创建单词列表。', '让 max 按单词长度选择最大项。', '输出最长的单词。'],
    ),
    challenge(
      'python-even-squares',
      '偶数的平方',
      '从数字列表中找出偶数，并计算它们的平方。',
      'Python',
      [
        'numbers = [1, 2, 3, 4, 5, 6]',
        'squares = [n * n for n in numbers if n % 2 == 0]',
        'print(squares)',
      ],
      ['准备一组连续数字。', '筛选偶数，并把每个偶数平方。', '输出新的平方列表。'],
    ),
    challenge(
      'python-frequency',
      '统计字符次数',
      '统计单词中每个字符出现的次数。',
      'Python',
      [
        'text = "banana"',
        'counts = {}',
        'for char in text:',
        '    counts[char] = counts.get(char, 0) + 1',
        'print(counts)',
      ],
      [
        '准备要统计的字符串。',
        '创建空字典保存计数。',
        '逐个读取字符串中的字符。',
        '读取旧次数并加一，首次出现时从零开始。',
        '输出字符频次字典。',
      ],
    ),
    challenge(
      'python-unique',
      '按顺序去重',
      '删除重复元素，同时保留第一次出现的顺序。',
      'Python',
      [
        'items = ["A", "B", "A", "C", "B"]',
        'unique = list(dict.fromkeys(items))',
        'print(unique)',
      ],
      ['创建包含重复值的列表。', '借助字典键唯一且有顺序的特点去重。', '输出去重结果。'],
    ),
    challenge(
      'python-factorial',
      '计算阶乘',
      '编写函数，计算一个正整数的阶乘。',
      'Python',
      [
        'def factorial(n):',
        '    result = 1',
        '    for value in range(2, n + 1):',
        '        result *= value',
        '    return result',
        'print(factorial(5))',
      ],
      [
        '定义接收数字 n 的函数。',
        '把累计结果初始化为一。',
        '从二遍历到 n。',
        '把当前数字乘进累计结果。',
        '返回最终阶乘。',
        '调用函数并输出五的阶乘。',
      ],
    ),
    challenge(
      'python-fibonacci',
      '生成斐波那契数列',
      '生成前八个斐波那契数。',
      'Python',
      [
        'a, b = 0, 1',
        'sequence = []',
        'for _ in range(8):',
        '    sequence.append(a)',
        '    a, b = b, a + b',
        'print(sequence)',
      ],
      [
        '初始化相邻的两个数。',
        '创建列表保存结果。',
        '循环八次，忽略循环变量。',
        '把当前数字加入列表。',
        '同时更新下一组相邻数字。',
        '输出生成的数列。',
      ],
    ),
    challenge(
      'python-grade-labels',
      '批量判断等级',
      '把每个分数转换为通过或重做。',
      'Python',
      [
        'scores = [58, 76, 91]',
        'labels = ["通过" if score >= 60 else "重做"',
        '          for score in scores]',
        'print(labels)',
      ],
      [
        '创建待判断的分数列表。',
        '用条件表达式决定每个分数的文字。',
        '列表推导式遍历全部分数。',
        '输出转换后的标签。',
      ],
    ),
  ],
  JavaScript: [
    challenge(
      'javascript-average',
      '及格分的平均值',
      '筛选及格分数，并计算平均值。',
      'JavaScript',
      [
        'const scores = [72, 88, 95, 61];',
        'const passed = scores.filter((score) => score >= 60);',
        'const total = passed.reduce((sum, score) => sum + score, 0);',
        'console.log((total / passed.length).toFixed(1));',
      ],
      ['创建成绩数组。', '用 filter 留下及格成绩。', '用 reduce 累加总分。', '计算平均值并保留一位小数。'],
    ),
    challenge(
      'javascript-count',
      '统计出现次数',
      '统计每种水果分别出现多少次。',
      'JavaScript',
      [
        "const fruits = ['apple', 'pear', 'apple'];",
        'const counts = {};',
        'for (const fruit of fruits) {',
        '  counts[fruit] = (counts[fruit] ?? 0) + 1;',
        '}',
        'console.log(counts);',
      ],
      [
        '创建包含重复水果名的数组。',
        '创建空对象保存计数。',
        '依次读取数组中的水果。',
        '取旧次数加一，首次出现时从零开始。',
        '结束循环代码块。',
        '输出统计结果。',
      ],
    ),
    challenge(
      'javascript-unique',
      '使用 Set 去重',
      '删除数组中的重复名字。',
      'JavaScript',
      [
        "const names = ['Li', 'Wang', 'Li', 'Zhao'];",
        'const uniqueNames = [...new Set(names)];',
        'console.log(uniqueNames);',
      ],
      ['创建包含重复名字的数组。', 'Set 去重后再展开为普通数组。', '输出去重后的名字。'],
    ),
    challenge(
      'javascript-cart',
      '计算购物车总价',
      '把购物车中每件商品的小计相加。',
      'JavaScript',
      [
        'const cart = [{ price: 12, qty: 2 }, { price: 8, qty: 3 }];',
        'const total = cart.reduce(',
        '  (sum, item) => sum + item.price * item.qty, 0',
        ');',
        'console.log(total);',
      ],
      [
        '创建包含单价和数量的购物车数组。',
        '开始使用 reduce 累计总价。',
        '计算商品小计并加入累计值。',
        '结束 reduce 调用。',
        '输出购物车总价。',
      ],
    ),
    challenge(
      'javascript-palindrome',
      '判断回文字符串',
      '判断字符串正读和反读是否相同。',
      'JavaScript',
      [
        "const text = 'level';",
        "const reversed = text.split('').reverse().join('');",
        'const isPalindrome = text === reversed;',
        'console.log(isPalindrome);',
      ],
      ['准备待判断的字符串。', '拆分、反转，再拼接成反向字符串。', '比较原字符串与反向字符串。', '输出判断结果。'],
    ),
    challenge(
      'javascript-adults',
      '筛选成年人',
      '从用户列表中筛选年龄不小于十八的人。',
      'JavaScript',
      [
        "const users = [{ name: 'Lin', age: 17 }, { name: 'Chen', age: 21 }];",
        'const adults = users.filter((user) => user.age >= 18);',
        'console.log(adults.map((user) => user.name));',
      ],
      ['创建包含姓名和年龄的用户数组。', '筛选年龄不小于十八的用户。', '提取并输出成年用户的姓名。'],
    ),
  ],
  Java: [
    challenge(
      'java-average',
      '及格分的平均值',
      '筛选及格分数，并计算平均值。',
      'Java',
      [
        'int[] scores = {72, 88, 95, 61};',
        'int sum = 0, count = 0;',
        'for (int score : scores) {',
        '    if (score >= 60) { sum += score; count++; }',
        '}',
        'double average = count == 0 ? 0 : (double) sum / count;',
        'System.out.printf("%.1f%n", average);',
      ],
      [
        '创建整数数组保存成绩。',
        '准备总分和人数两个计数器。',
        '增强 for 循环依次读取成绩。',
        '及格时累加总分和人数。',
        '结束循环。',
        '避免除以零并计算浮点平均值。',
        '按一位小数输出平均值。',
      ],
    ),
    challenge(
      'java-longest',
      '找出最长的单词',
      '从数组中找到字符数量最多的单词。',
      'Java',
      [
        'String[] words = {"why", "practice", "code"};',
        'String longest = words[0];',
        'for (String word : words) {',
        '    if (word.length() > longest.length()) longest = word;',
        '}',
        'System.out.println(longest);',
      ],
      ['创建字符串数组。', '先把第一项当作当前最长项。', '依次读取每个单词。', '遇到更长单词时更新结果。', '结束循环。', '输出最长单词。'],
    ),
    challenge(
      'java-reverse',
      '反转字符串',
      '使用 StringBuilder 反转一段文字。',
      'Java',
      [
        'String text = "Why";',
        'String reversed = new StringBuilder(text)',
        '        .reverse().toString();',
        'System.out.println(reversed);',
      ],
      ['准备原始字符串。', '把字符串交给可变字符序列处理。', '执行反转并转回 String。', '输出反转结果。'],
    ),
    challenge(
      'java-vowels',
      '统计元音字母',
      '统计英文单词中元音字母的数量。',
      'Java',
      [
        'String word = "education".toLowerCase();',
        'int count = 0;',
        'for (char ch : word.toCharArray()) {',
        '    if ("aeiou".indexOf(ch) >= 0) count++;',
        '}',
        'System.out.println(count);',
      ],
      ['把单词统一转换为小写。', '初始化元音计数器。', '把字符串转成字符数组并遍历。', '字符属于元音集合时计数加一。', '结束循环。', '输出元音数量。'],
    ),
    challenge(
      'java-maximum',
      '寻找数组最大值',
      '一次遍历找出整数数组中的最大值。',
      'Java',
      [
        'int[] numbers = {4, 9, 2, 7};',
        'int maximum = numbers[0];',
        'for (int number : numbers) {',
        '    if (number > maximum) maximum = number;',
        '}',
        'System.out.println(maximum);',
      ],
      ['创建整数数组。', '使用第一项初始化最大值。', '依次读取每个数字。', '遇到更大的值时更新最大值。', '结束循环。', '输出最终最大值。'],
    ),
    challenge(
      'java-frequency',
      '统计单词次数',
      '使用 Map 统计每个单词出现的次数。',
      'Java',
      [
        'String[] words = {"code", "why", "code"};',
        'Map<String, Integer> counts = new HashMap<>();',
        'for (String word : words) {',
        '    int oldCount = counts.getOrDefault(word, 0);',
        '    counts.put(word, oldCount + 1);',
        '}',
        'System.out.println(counts);',
      ],
      [
        '创建包含重复值的字符串数组。',
        '创建键为单词、值为次数的 Map。',
        '依次读取每个单词。',
        '读取旧次数，首次出现时使用零。',
        '把加一后的次数写回 Map。',
        '结束循环。',
        '输出频次统计结果。',
      ],
    ),
  ],
}

export const TOTAL_CHALLENGES = Object.values(challengesByLanguage).reduce(
  (total, challenges) => total + challenges.length,
  0,
)
