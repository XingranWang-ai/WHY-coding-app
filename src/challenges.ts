import { allChallenges as detailedChallengeData } from './detailedChallenges'

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
  source: 'detailed' | 'legacy'
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
    source: 'legacy',
  }
}

// ============================================================
// Python — 28 题
// ============================================================
const pythonChallenges: Challenge[] = [
  challenge(
    'python-average', '及格分的平均值', '筛选及格分数，并计算平均值。',
    'Python',
    ['scores = [72, 88, 95, 61]', 'passed = [score for score in scores if score >= 60]', 'average = sum(passed) / len(passed)', "print(f\"{average:.1f}\")"],
    ['创建列表，保存四个学生的成绩。', '列表推导式只保留大于等于 60 的成绩。', '用总分除以人数，得到平均分。', '把平均分保留一位小数并输出。'],
  ),
  challenge(
    'python-longest', '找出最长的单词', '从列表中找到字符数量最多的单词。',
    'Python',
    ['words = ["why", "practice", "code"]', 'longest = max(words, key=lambda word: len(word))', 'print(longest)'],
    ['创建单词列表。', '让 max 按单词长度选择最大项。', '输出最长的单词。'],
  ),
  challenge(
    'python-even-squares', '偶数的平方', '从数字列表中找出偶数，并计算它们的平方。',
    'Python',
    ['numbers = [1, 2, 3, 4, 5, 6]', 'squares = [n * n for n in numbers if n % 2 == 0]', 'print(squares)'],
    ['准备一组连续数字。', '筛选偶数，并把每个偶数平方。', '输出新的平方列表。'],
  ),
  challenge(
    'python-frequency', '统计字符次数', '统计单词中每个字符出现的次数。',
    'Python',
    ['text = "banana"', 'counts = {}', 'for char in text:', '    counts[char] = counts.get(char, 0) + 1', 'print(counts)'],
    ['准备要统计的字符串。', '创建空字典保存计数。', '逐个读取字符串中的字符。', '读取旧次数并加一，首次出现时从零开始。', '输出字符频次字典。'],
  ),
  challenge(
    'python-unique', '按顺序去重', '删除重复元素，同时保留第一次出现的顺序。',
    'Python',
    ['items = ["A", "B", "A", "C", "B"]', 'unique = list(dict.fromkeys(items))', 'print(unique)'],
    ['创建包含重复值的列表。', '借助字典键唯一且有顺序的特点去重。', '输出去重结果。'],
  ),
  challenge(
    'python-factorial', '计算阶乘', '编写函数，计算一个正整数的阶乘。',
    'Python',
    ['def factorial(n):', '    result = 1', '    for value in range(2, n + 1):', '        result *= value', '    return result', 'print(factorial(5))'],
    ['定义接收数字 n 的函数。', '把累计结果初始化为一。', '从二遍历到 n。', '把当前数字乘进累计结果。', '返回最终阶乘。', '调用函数并输出五的阶乘。'],
  ),
  challenge(
    'python-fibonacci', '生成斐波那契数列', '生成前八个斐波那契数。',
    'Python',
    ['a, b = 0, 1', 'sequence = []', 'for _ in range(8):', '    sequence.append(a)', '    a, b = b, a + b', 'print(sequence)'],
    ['初始化相邻的两个数。', '创建列表保存结果。', '循环八次，忽略循环变量。', '把当前数字加入列表。', '同时更新下一组相邻数字。', '输出生成的数列。'],
  ),
  challenge(
    'python-grade-labels', '批量判断等级', '把每个分数转换为通过或重做。',
    'Python',
    ['scores = [58, 76, 91]', 'labels = ["通过" if score >= 60 else "重做"', '          for score in scores]', 'print(labels)'],
    ['创建待判断的分数列表。', '用条件表达式决定每个分数的文字。', '列表推导式遍历全部分数。', '输出转换后的标签。'],
  ),
  challenge(
    'python-reverse-str', '反转字符串', '使用切片倒序输出一个字符串。',
    'Python',
    ['text = "hello world"', 'reversed_text = text[::-1]', 'print(reversed_text)'],
    ['准备原始字符串。', '步长为负一的切片实现反转。', '输出反转后的字符串。'],
  ),
  challenge(
    'python-is-prime', '判断素数', '判断一个正整数是否为素数。',
    'Python',
    ['def is_prime(n):', '    if n < 2:', '        return False', '    for i in range(2, int(n ** 0.5) + 1):', '        if n % i == 0:', '            return False', '    return True', 'print(is_prime(17))'],
    ['定义接收整数 n 的函数。', '小于二不是素数，直接返回 False。', '立即退出函数。', '从二遍历到根号 n。', '一旦能整除就不是素数。', '找到因子则返回 False。', '遍历完毕无因子，返回 True。', '调用函数输出十七的判断结果。'],
  ),
  challenge(
    'python-merge-lists', '合并两个列表', '把两个列表拼接成一个新列表。',
    'Python',
    ['list_a = [1, 2, 3]', 'list_b = [4, 5, 6]', 'merged = list_a + list_b', 'print(merged)'],
    ['准备第一个列表。', '准备第二个列表。', '加号将两个列表拼接成一个。', '输出合并后的列表。'],
  ),
  challenge(
    'python-min-max', '找出最值', '返回列表中最大值和最小值。',
    'Python',
    ['values = [17, 5, 23, 9, 14]', 'maximum = max(values)', 'minimum = min(values)', 'print(f"max={maximum}, min={minimum}")'],
    ['准备一组整数。', '内置函数 max 找到最大值。', '内置函数 min 找到最小值。', '格式化输出最值结果。'],
  ),
  challenge(
    'python-sort-list', '列表排序', '对数字列表升序排列。',
    'Python',
    ['nums = [5, 2, 8, 1, 3]', 'nums.sort()', 'print(nums)'],
    ['创建一个无序数字列表。', 'sort 方法原地排序，默认升序。', '输出已排序的列表。'],
  ),
  challenge(
    'python-case-swap', '大小写转换', '把字符串中大写变小写，小写变大写。',
    'Python',
    ['text = "Hello World"', 'swapped = text.swapcase()', 'print(swapped)'],
    ['准备包含大小写的字符串。', 'swapcase 交换每个字母的大小写。', '输出转换后的结果。'],
  ),
  challenge(
    'python-word-count', '统计单词数', '统计一句话中有多少个单词。',
    'Python',
    ['sentence = "practice makes perfect"', 'words = sentence.split()', 'word_count = len(words)', 'print(word_count)'],
    ['准备一句英文。', 'split 默认按空白字符分割。', '取列表长度即为单词数量。', '输出单词个数。'],
  ),
  challenge(
    'python-sum-list', '列表求和', '计算列表中所有数字的总和。',
    'Python',
    ['numbers = [10, 20, 30, 40]', 'total = sum(numbers)', 'print(total)'],
    ['创建一个数字列表。', '内置函数 sum 计算总和。', '输出累加结果。'],
  ),
  challenge(
    'python-filter-empty', '过滤空字符串', '从列表中移除空字符串。',
    'Python',
    ['items = ["a", "", "b", "", "c"]', 'non_empty = [x for x in items if x != ""]', 'print(non_empty)'],
    ['创建包含空字符串的列表。', '列表推导式只保留非空项。', '输出过滤后的列表。'],
  ),
  challenge(
    'python-leap-year', '判断闰年', '判断一个年份是平年还是闰年。',
    'Python',
    ['year = 2024', 'is_leap = (year % 4 == 0 and year % 100 != 0)', '           or (year % 400 == 0)', 'print("闰年" if is_leap else "平年")'],
    ['设定待判断的年份。', '能被四整除但不能被一百整除。', '或者能被四百整除也是闰年。', '条件表达式输出平年或闰年。'],
  ),
  challenge(
    'python-extract-digits', '提取数字', '从字符串中提取所有数字字符。',
    'Python',
    ['text = "a1b2c3"', 'digits = [ch for ch in text if ch.isdigit()]', "print(''.join(digits))"],
    ['准备包含字母和数字的字符串。', 'isdigit 筛选数字字符放入列表。', '拼接数字列表并输出。'],
  ),
  challenge(
    'python-slice-list', '列表切片', '截取列表中间一段作为子列表。',
    'Python',
    ['nums = [0, 1, 2, 3, 4, 5]', 'middle = nums[2:5]', 'print(middle)'],
    ['创建零到五的列表。', '切片取索引二到四的元素，不含五。', '输出截取的子列表。'],
  ),
  challenge(
    'python-merge-dicts', '字典合并', '使用新语法合并两个字典。',
    'Python',
    ['dict_a = {"x": 1, "y": 2}', 'dict_b = {"y": 99, "z": 3}', 'merged = dict_a | dict_b', 'print(merged)'],
    ['创建第一个字典。', '创建第二个字典，键 y 重复。', '管道运算符合并，后者覆盖同名字段。', '输出合并后的字典。'],
  ),
  challenge(
    'python-common-items', '找出共同元素', '用集合找出两个列表的共同项。',
    'Python',
    ['list1 = [1, 2, 3, 4]', 'list2 = [3, 4, 5, 6]', 'common = list(set(list1) & set(list2))', 'print(common)'],
    ['准备第一个列表。', '准备第二个列表。', '转为集合取交集，再转回列表。', '输出共同元素。'],
  ),
  challenge(
    'python-random-num', '生成随机数', '生成一个指定范围内的随机整数。',
    'Python',
    ['import random', 'number = random.randint(1, 100)', 'print(number)'],
    ['导入 random 随机模块。', 'randint 返回一到一百间的随机整数。', '输出生成的随机数。'],
  ),
  challenge(
    'python-group-words', '按首字母分组', '把单词按首字母归类到字典中。',
    'Python',
    ['words = ["apple", "ant", "bee", "bat"]', 'groups = {}', 'for w in words:', '    first = w[0]', '    groups.setdefault(first, []).append(w)', 'print(groups)'],
    ['准备单词列表。', '创建空字典保存分组。', '遍历每个单词。', '取单词的第一个字符。', '键不存在时创建空列表，再追加。', '输出分组结果。'],
  ),
  challenge(
    'python-fstring', '格式化输出', '使用 f-string 嵌入表达式输出。',
    'Python',
    ['name = "Why"', 'count = 42', 'print(f"{name} 已刷 {count} 题")'],
    ['定义字符串变量。', '定义整数变量。', '花括号内直接使用变量名嵌入。'],
  ),
  challenge(
    'python-recursive-sum', '递归求和', '使用递归函数计算一到 N 的累加和。',
    'Python',
    ['def sum_to(n):', '    if n <= 1:', '        return n', '    return n + sum_to(n - 1)', 'print(sum_to(10))'],
    ['定义递归求和函数。', '基准情况：n 小于等于一，直接返回。', '返回当前 n 本身。', '递归调用，将 n 加上前面所有数之和。', '计算一加到十的结果并输出。'],
  ),
  challenge(
    'python-zip-lists', '同时遍历两个列表', '使用 zip 将两个列表合并为元组列表。',
    'Python',
    ['names = ["Alice", "Bob", "Carol"]', 'scores = [85, 92, 78]', 'pairs = list(zip(names, scores))', 'print(pairs)'],
    ['准备姓名列表。', '准备对应的分数列表。', 'zip 将两个列表配对成元组迭代器再转列表。', '输出配对结果。'],
  ),
]

// ============================================================
// JavaScript — 26 题
// ============================================================
const jsChallenges: Challenge[] = [
  challenge(
    'javascript-average', '及格分的平均值', '筛选及格分数，并计算平均值。',
    'JavaScript',
    ['const scores = [72, 88, 95, 61];', 'const passed = scores.filter((score) => score >= 60);', 'const total = passed.reduce((sum, score) => sum + score, 0);', 'console.log((total / passed.length).toFixed(1));'],
    ['创建成绩数组。', '用 filter 留下及格成绩。', '用 reduce 累加总分。', '计算平均值并保留一位小数。'],
  ),
  challenge(
    'javascript-count', '统计出现次数', '统计每种水果分别出现多少次。',
    'JavaScript',
    ["const fruits = ['apple', 'pear', 'apple'];", 'const counts = {};', 'for (const fruit of fruits) {', '  counts[fruit] = (counts[fruit] ?? 0) + 1;', '}', 'console.log(counts);'],
    ['创建包含重复水果名的数组。', '创建空对象保存计数。', '依次读取数组中的水果。', '取旧次数加一，首次出现时从零开始。', '结束循环代码块。', '输出统计结果。'],
  ),
  challenge(
    'javascript-unique', '使用 Set 去重', '删除数组中的重复名字。',
    'JavaScript',
    ["const names = ['Li', 'Wang', 'Li', 'Zhao'];", 'const uniqueNames = [...new Set(names)];', 'console.log(uniqueNames);'],
    ['创建包含重复名字的数组。', 'Set 去重后再展开为普通数组。', '输出去重后的名字。'],
  ),
  challenge(
    'javascript-cart', '计算购物车总价', '把购物车中每件商品的小计相加。',
    'JavaScript',
    ['const cart = [{ price: 12, qty: 2 }, { price: 8, qty: 3 }];', 'const total = cart.reduce(', '  (sum, item) => sum + item.price * item.qty, 0', ');', 'console.log(total);'],
    ['创建包含单价和数量的购物车数组。', '开始使用 reduce 累计总价。', '计算商品小计并加入累计值。', '结束 reduce 调用。', '输出购物车总价。'],
  ),
  challenge(
    'javascript-palindrome', '判断回文字符串', '判断字符串正读和反读是否相同。',
    'JavaScript',
    ["const text = 'level';", "const reversed = text.split('').reverse().join('');", 'const isPalindrome = text === reversed;', 'console.log(isPalindrome);'],
    ['准备待判断的字符串。', '拆分、反转，再拼接成反向字符串。', '比较原字符串与反向字符串。', '输出判断结果。'],
  ),
  challenge(
    'javascript-adults', '筛选成年人', '从用户列表中筛选年龄不小于十八的人。',
    'JavaScript',
    ["const users = [{ name: 'Lin', age: 17 }, { name: 'Chen', age: 21 }];", 'const adults = users.filter((user) => user.age >= 18);', 'console.log(adults.map((user) => user.name));'],
    ['创建包含姓名和年龄的用户数组。', '筛选年龄不小于十八的用户。', '提取并输出成年用户的姓名。'],
  ),
  challenge(
    'js-reverse-arr', '反转数组', '原地反转数组并输出。',
    'JavaScript',
    ["const arr = [1, 2, 3, 4, 5];", 'arr.reverse();', 'console.log(arr);'],
    ['创建原始数组。', 'reverse 方法原地反转数组。', '输出反转后的数组。'],
  ),
  challenge(
    'js-is-prime', '判断素数', '编写函数判断一个数是否为素数。',
    'JavaScript',
    ['function isPrime(n) {', '  if (n < 2) return false;', '  for (let i = 2; i <= Math.sqrt(n); i++) {', '    if (n % i === 0) return false;', '  }', '  return true;', '}', 'console.log(isPrime(17));'],
    ['定义接收数字 n 的函数。', '小于 2 不是素数，直接返回 false。', '从 2 遍历到根号 n。', '一旦被整除说明不是素数。', '结束循环块。', '没有因子则返回 true。', '结束函数定义。', '调用函数输出判断结果。'],
  ),
  challenge(
    'js-merge-arr', '合并数组', '使用展开运算符合并两个数组。',
    'JavaScript',
    ['const a = [1, 2, 3];', 'const b = [4, 5, 6];', 'const merged = [...a, ...b];', 'console.log(merged);'],
    ['创建第一个数组。', '创建第二个数组。', '展开运算符将两个数组合并成一个。', '输出合并后的新数组。'],
  ),
  challenge(
    'js-min-max', '找出数组最值', '使用 spread 语法快速找到最大值和最小值。',
    'JavaScript',
    ['const nums = [17, 5, 23, 9, 14];', 'const max = Math.max(...nums);', 'const min = Math.min(...nums);', 'console.log(`max=${max}, min=${min}`);'],
    ['准备一组数字。', '展开数组传给 Math.max。', '展开数组传给 Math.min。', '模板字符串输出最值。'],
  ),
  challenge(
    'js-sort-arr', '数组排序', '对数字数组升序排列。',
    'JavaScript',
    ['const nums = [5, 2, 8, 1, 3];', 'nums.sort((a, b) => a - b);', 'console.log(nums);'],
    ['创建无序数组。', '传入比较器确保按数值大小排序。', '输出排序后的数组。'],
  ),
  challenge(
    'js-template', '字符串插值', '使用模板字符串拼接变量和文本。',
    'JavaScript',
    ['const name = "Why";', 'const count = 42;', 'console.log(`${name} 已刷 ${count} 题`);'],
    ['定义变量 name。', '定义变量 count。', '用反引号和 ${} 在字符串中嵌入变量。'],
  ),
  challenge(
    'js-sum-arr', '数组求和', '使用 reduce 计算数组总和。',
    'JavaScript',
    ['const nums = [10, 20, 30, 40];', 'const total = nums.reduce((sum, n) => sum + n, 0);', 'console.log(total);'],
    ['创建数字数组。', 'reduce 从零开始累加每个数字。', '输出总和。'],
  ),
  challenge(
    'js-filter-falsy', '过滤假值', '移除数组中的 falsy 值。',
    'JavaScript',
    ['const items = [0, "hi", null, "", "ok", undefined];', 'const truthy = items.filter(Boolean);', 'console.log(truthy);'],
    ['创建包含假值的数组。', 'Boolean 作为 filter 回调过滤掉假值。', '输出只含真值的数组。'],
  ),
  challenge(
    'js-merge-obj', '合并对象', '使用 spread 合并两个对象的属性。',
    'JavaScript',
    ['const objA = { x: 1, y: 2 };', 'const objB = { y: 99, z: 3 };', 'const merged = { ...objA, ...objB };', 'console.log(merged);'],
    ['创建第一个对象。', '创建第二个对象，键 y 重复。', 'spread 合并，后者同名字段覆盖前者。', '输出合并结果。'],
  ),
  challenge(
    'js-map-names', 'map 转换', '取对象数组中的某个字段组成新数组。',
    'JavaScript',
    ["const users = [{ name: 'Tom' }, { name: 'Jerry' }];", 'const names = users.map((u) => u.name);', 'console.log(names);'],
    ['创建包含 name 字段的对象数组。', 'map 把每个对象转为其 name 值。', '输出名字列表。'],
  ),
  challenge(
    'js-random-int', '随机整数', '生成一个范围在 min 和 max 之间的随机整数。',
    'JavaScript',
    ['const randomInt = (min, max) => {', '  return Math.floor(Math.random() * (max - min + 1)) + min;', '};', 'console.log(randomInt(1, 100));'],
    ['定义箭头函数，接收 min 和 max。', 'Math.random 缩放位移后向下取整。', '结束函数定义。', '调用函数生成一到一百的随机数。'],
  ),
  challenge(
    'js-palindrome-num', '回文数字', '判断一个数字是否是回文。',
    'JavaScript',
    ['const isNumPalindrome = (n) => {', "  const s = String(n);", "  return s === s.split('').reverse().join('');", '};', 'console.log(isNumPalindrome(121));'],
    ['定义箭头函数接收数字 n。', '把数字转成字符串。', '比较原字符串与反转后的字符串。', '结束函数。', '测试数字 121 是否为回文。'],
  ),
  challenge(
    'js-find-item', 'find 查找', '用 find 找到第一个符合条件的数据。',
    'JavaScript',
    ['const tasks = [', "  { id: 1, done: false }, { id: 2, done: true }];", 'const firstDone = tasks.find((t) => t.done);', 'console.log(firstDone);'],
    ['创建任务数组。', '包含两个不同状态的任务。', 'find 返回第一个 done 为 true 的任务。', '输出找到的任务对象。'],
  ),
  challenge(
    'js-slice-str', '字符串截取', '使用 slice 提取字符串的一部分。',
    'JavaScript',
    ["const text = 'hello world';", 'const sub = text.slice(0, 5);', 'console.log(sub);'],
    ['准备原始字符串。', 'slice 从索引 0 开始截取 5 个字符。', '输出子字符串。'],
  ),
  challenge(
    'js-flat-arr', '数组扁平化', '把嵌套数组展开为一层。',
    'JavaScript',
    ['const nested = [1, [2, 3], [4, [5]]];', 'const flat = nested.flat(2);', 'console.log(flat);'],
    ['创建多层嵌套数组。', 'flat(2) 展开到第二层。', '输出扁平化结果。'],
  ),
  challenge(
    'js-every-some', 'every 与 some', '检查数组是否全部或部分满足条件。',
    'JavaScript',
    ['const ages = [18, 22, 17, 25];', 'const allAdult = ages.every((age) => age >= 18);', 'const hasMinor = ages.some((age) => age < 18);', 'console.log({ allAdult, hasMinor });'],
    ['创建年龄数组。', 'every 检查是否全部成年。', 'some 检查是否存在未成年人。', '输出两个检查结果。'],
  ),
  challenge(
    'js-day-diff', '计算日期差', '计算两个日期之间相隔多少天。',
    'JavaScript',
    ["const d1 = new Date('2025-01-01');", "const d2 = new Date('2025-01-10');", 'const diffMs = d2 - d1;', 'const days = diffMs / (1000 * 60 * 60 * 24);', 'console.log(days);'],
    ['创建第一个日期对象。', '创建第二个日期对象。', '日期相减得到毫秒差值。', '毫秒除以一天的毫秒数得到天数。', '输出相差天数。'],
  ),
  challenge(
    'js-factorial-rec', '递归阶乘', '使用递归计算阶乘。',
    'JavaScript',
    ['function factorial(n) {', '  if (n <= 1) return 1;', '  return n * factorial(n - 1);', '}', 'console.log(factorial(5));'],
    ['定义阶乘函数。', '基准：n 小于等于 1 返回 1。', '递归调用 n 乘以前面所有数的阶乘。', '结束函数。', '计算并输出 5 的阶乘。'],
  ),
  challenge(
    'js-object-keys', '获取对象键列表', '返回对象所有自有属性名。',
    'JavaScript',
    ["const book = { title: 'Why', pages: 200 };", 'const keys = Object.keys(book);', 'console.log(keys);'],
    ['定义包含书名和页数的对象。', 'Object.keys 返回键名数组。', '输出属性名列表。'],
  ),
]

// ============================================================
// Java — 26 题
// ============================================================
const javaChallenges: Challenge[] = [
  challenge(
    'java-average', '及格分的平均值', '筛选及格分数，并计算平均值。',
    'Java',
    ['int[] scores = {72, 88, 95, 61};', 'int sum = 0, count = 0;', 'for (int score : scores) {', '    if (score >= 60) { sum += score; count++; }', '}', 'double average = count == 0 ? 0 : (double) sum / count;', 'System.out.printf("%.1f%n", average);'],
    ['创建整数数组保存成绩。', '准备总分和人数两个计数器。', '增强 for 循环依次读取成绩。', '及格时累加总分和人数。', '结束循环。', '避免除以零并计算浮点平均值。', '按一位小数输出平均值。'],
  ),
  challenge(
    'java-longest', '找出最长的单词', '从数组中找到字符数量最多的单词。',
    'Java',
    ['String[] words = {"why", "practice", "code"};', 'String longest = words[0];', 'for (String word : words) {', '    if (word.length() > longest.length()) longest = word;', '}', 'System.out.println(longest);'],
    ['创建字符串数组。', '先把第一项当作当前最长项。', '依次读取每个单词。', '遇到更长单词时更新结果。', '结束循环。', '输出最长单词。'],
  ),
  challenge(
    'java-reverse', '反转字符串', '使用 StringBuilder 反转一段文字。',
    'Java',
    ['String text = "Why";', 'String reversed = new StringBuilder(text)', '        .reverse().toString();', 'System.out.println(reversed);'],
    ['准备原始字符串。', '把字符串交给可变字符序列处理。', '执行反转并转回 String。', '输出反转结果。'],
  ),
  challenge(
    'java-vowels', '统计元音字母', '统计英文单词中元音字母的数量。',
    'Java',
    ['String word = "education".toLowerCase();', 'int count = 0;', 'for (char ch : word.toCharArray()) {', '    if ("aeiou".indexOf(ch) >= 0) count++;', '}', 'System.out.println(count);'],
    ['把单词统一转换为小写。', '初始化元音计数器。', '把字符串转成字符数组并遍历。', '字符属于元音集合时计数加一。', '结束循环。', '输出元音数量。'],
  ),
  challenge(
    'java-maximum', '寻找数组最大值', '一次遍历找出整数数组中的最大值。',
    'Java',
    ['int[] numbers = {4, 9, 2, 7};', 'int maximum = numbers[0];', 'for (int number : numbers) {', '    if (number > maximum) maximum = number;', '}', 'System.out.println(maximum);'],
    ['创建整数数组。', '使用第一项初始化最大值。', '依次读取每个数字。', '遇到更大的值时更新最大值。', '结束循环。', '输出最终最大值。'],
  ),
  challenge(
    'java-frequency', '统计单词次数', '使用 Map 统计每个单词出现的次数。',
    'Java',
    ['String[] words = {"code", "why", "code"};', 'Map<String, Integer> counts = new HashMap<>();', 'for (String word : words) {', '    int oldCount = counts.getOrDefault(word, 0);', '    counts.put(word, oldCount + 1);', '}', 'System.out.println(counts);'],
    ['创建包含重复值的字符串数组。', '创建键为单词、值为次数的 Map。', '依次读取每个单词。', '读取旧次数，首次出现时使用零。', '把加一后的次数写回 Map。', '结束循环。', '输出频次统计结果。'],
  ),
  challenge(
    'java-reverse-arr', '反转数组', '就地反转整数数组。',
    'Java',
    ['int[] arr = {1, 2, 3, 4, 5};', 'for (int i = 0; i < arr.length / 2; i++) {', '    int temp = arr[i];', '    arr[i] = arr[arr.length - 1 - i];', '    arr[arr.length - 1 - i] = temp;', '}', 'System.out.println(java.util.Arrays.toString(arr));'],
    ['创建整数数组。', '只需遍历到数组中间位置。', '用临时变量暂存当前元素。', '把对称位置的值赋给当前位置。', '把暂存的原值赋给对称位置。', '结束循环。', '用 Arrays.toString 输出反转结果。'],
  ),
  challenge(
    'java-is-prime', '判断素数', '编写方法判断整数是否为素数。',
    'Java',
    ['boolean isPrime(int n) {', '    if (n < 2) return false;', '    for (int i = 2; i <= Math.sqrt(n); i++) {', '        if (n % i == 0) return false;', '    }', '    return true;', '}'],
    ['定义接收整数 n 的布尔方法。', '小于二不是素数直接返回。', '从二开始到根号 n 逐一试除。', '若能整除则不是素数。', '结束内层循环。', '没有因子则返回 true。', '结束方法定义。'],
  ),
  challenge(
    'java-bubble-sort', '冒泡排序', '用冒泡法对数组升序排列。',
    'Java',
    ['int[] arr = {5, 1, 4, 2, 8};', 'for (int i = 0; i < arr.length - 1; i++) {', '    for (int j = 0; j < arr.length - 1 - i; j++) {', '        if (arr[j] > arr[j + 1]) {', '            int tmp = arr[j];', '            arr[j] = arr[j + 1];', '            arr[j + 1] = tmp;', '        }', '    }', '}'],
    ['创建待排序数组。', '外层循环控制比较轮数。', '内层循环逐一比较相邻元素。', '如果前面的比后面的大就交换。', '暂存前面的值。', '把后面的值赋给前面。', '把暂存值赋给后面的位置。', '结束 if 块。', '结束内层循环。', '结束外层循环。'],
  ),
  challenge(
    'java-binary-search', '二分查找', '在已排序数组中二分查找目标值。',
    'Java',
    ['int[] arr = {1, 3, 5, 7, 9, 11};', 'int target = 7, left = 0, right = arr.length - 1;', 'while (left <= right) {', '    int mid = left + (right - left) / 2;', '    if (arr[mid] == target) return mid;', '    else if (arr[mid] < target) left = mid + 1;', '    else right = mid - 1;', '}'],
    ['创建已排序的整数数组。', '设置目标值并初始化左右边界。', '当左边界不超过右边界时继续。', '计算防溢出的中间索引。', '找到目标值时返回索引。', '目标在右侧则收缩左边界。', '目标在左侧则收缩右边界。', '结束循环。'],
  ),
  challenge(
    'java-multi-table', '九九乘法表', '使用嵌套循环打印十进制乘法表。',
    'Java',
    ['for (int i = 1; i <= 9; i++) {', '    for (int j = 1; j <= i; j++) {', '        System.out.print(j + "*" + i + "=" + (i * j) + "\\t");', '    }', '    System.out.println();', '}'],
    ['外层循环控制行号一到九。', '内层循环列号从一到行号。', '打印乘法式子，tab 分隔各列。', '结束内层循环。', '每行输出完换行。', '结束外层循环。'],
  ),
  challenge(
    'java-leap-year', '判断闰年', '使用条件表达式判断年份是否为闰年。',
    'Java',
    ['int year = 2024;', 'boolean isLeap = (year % 4 == 0 && year % 100 != 0)', '               || (year % 400 == 0);', 'System.out.println(isLeap ? "闰年" : "平年");'],
    ['设定待判断的年份。', '能被四整除且不能被一百整除。', '或者能被四百整除。', '三元运算输出中文结果。'],
  ),
  challenge(
    'java-arraylist', 'ArrayList 操作', '使用动态数组增删遍历元素。',
    'Java',
    ['java.util.ArrayList<String> list = new java.util.ArrayList<>();', 'list.add("Java");', 'list.add("Python");', 'list.remove("Java");', 'for (String item : list) { System.out.println(item); }'],
    ['创建字符串类型的 ArrayList。', '添加第一个元素。', '添加第二个元素。', '移除指定元素 Java。', '增强 for 遍历并输出剩余元素。'],
  ),
  challenge(
    'java-string-join', '字符串拼接', '使用 String.join 连接字符串数组。',
    'Java',
    ['String[] parts = {"Hello", "World"};', 'String result = String.join(" ", parts);', 'System.out.println(result);'],
    ['创建字符串数组。', '用空格作为分隔符拼接数组。', '输出拼接后的字符串。'],
  ),
  challenge(
    'java-array-copy', '数组复制', '使用 System.arraycopy 复制数组。',
    'Java',
    ['int[] source = {10, 20, 30};', 'int[] target = new int[source.length];', 'System.arraycopy(source, 0, target, 0, source.length);', 'System.out.println(java.util.Arrays.toString(target));'],
    ['创建源数组。', '创建与源数组等长的目标数组。', '从源偏移零复制到目标偏移零，全部长度。', '输出目标数组验证复制成功。'],
  ),
  challenge(
    'java-std-dev', '计算标准差', '计算一组数字的标准差。',
    'Java',
    ['double[] data = {2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0};', 'double sum = 0;', 'for (double d : data) sum += d;', 'double mean = sum / data.length;', 'double sqSum = 0;', 'for (double d : data) sqSum += Math.pow(d - mean, 2);', 'double stdDev = Math.sqrt(sqSum / data.length);', 'System.out.printf("%.2f%n", stdDev);'],
    ['定义待分析的双精度数组。', '初始化总和累加器。', '遍历数组累加所有元素。', '总和除以长度得到平均值。', '初始化离差平方和累加器。', '遍历累加每个值与平均值的差的平方。', '方差开平方得到标准差。', '保留两位小数输出标准差。'],
  ),
  challenge(
    'java-regex-match', '正则匹配', '用正则检查字符串是否全是数字。',
    'Java',
    ['String input = "12345";', 'boolean isDigits = input.matches("\\\\d+");', 'System.out.println(isDigits);'],
    ['准备待验证的字符串。', 'matches 使用正则 \\d+ 匹配纯数字。', '输出验证结果 true 或 false。'],
  ),
  challenge(
    'java-split-str', '字符串分割', '使用 split 把逗号分隔字符串转为数组。',
    'Java',
    ['String csv = "apple,pear,grape";', 'String[] fruits = csv.split(",");', 'for (String f : fruits) { System.out.print(f + " "); }'],
    ['准备逗号分隔的字符串。', 'split 按逗号切割成字符串数组。', '遍历输出每个水果名称。'],
  ),
  challenge(
    'java-factorial-rec', '递归求阶乘', '编写递归方法计算阶乘。',
    'Java',
    ['int factorial(int n) {', '    if (n <= 1) return 1;', '    return n * factorial(n - 1);', '}'],
    ['定义返回整数的阶乘方法。', '基准条件：n 小于等于 1 返回 1。', '递归调用 n 乘以前一值的阶乘。', '结束方法定义。'],
  ),
  challenge(
    'java-stream-filter', 'Stream 过滤', '用 Java Stream 过滤并收集偶数值。',
    'Java',
    ['int[] nums = {1, 2, 3, 4, 5, 6};', 'int[] evens = java.util.Arrays.stream(nums)', '    .filter(n -> n % 2 == 0)', '    .toArray();', 'System.out.println(java.util.Arrays.toString(evens));'],
    ['创建原始整数数组。', '使用 Arrays.stream 转为 IntStream。', 'filter 保留能被二整除的元素。', '收集回整数数组。', '输出结果为仅含偶数的数组。'],
  ),
  challenge(
    'java-hashmap-iter', '遍历 HashMap', '使用 entrySet 遍历 Map 的键值对。',
    'Java',
    ['Map<String, Integer> map = new HashMap<>();', 'map.put("apple", 3);', 'map.put("pear", 5);', 'for (Map.Entry<String, Integer> e : map.entrySet()) {', '    System.out.println(e.getKey() + ":" + e.getValue());', '}'],
    ['创建 HashMap。', '添加第一个键值对。', '添加第二个键值对。', 'entrySet 提供键值对视图，增强 for 遍历。', '输出每个键值组合。', '结束循环。'],
  ),
  challenge(
    'java-char-count', '字符计数', '遍历字符数组并统计特定字符的出现次数。',
    'Java',
    ["char[] letters = {'a', 'b', 'a', 'c', 'a'};", "int count = 0;", 'for (char ch : letters) {', "    if (ch == 'a') count++;", '}', 'System.out.println(count);'],
    ['创建字符数组。', '初始化计数器为零。', '增强 for 遍历每个字符。', '遇到字符 a 时计数加一。', '结束循环。', '输出 a 的统计次数。'],
  ),
  challenge(
    'java-try-catch', '异常处理', '捕获除以零的算术异常，避免程序崩溃。',
    'Java',
    ['int a = 10, b = 0;', 'try {', '    int result = a / b;', '} catch (ArithmeticException e) {', '    System.out.println("不能除以零");', '}'],
    ['定义一个非零值和一个零值。', '尝试执行可能抛出异常的代码。', '整数除以零会抛出算术异常。', '捕获 ArithmeticException。', '输出友好的错误提示。', '结束 try-catch 块。'],
  ),
  challenge(
    'java-method-ref', '方法引用', '使用方法引用简化 Lambda 表达式打印列表。',
    'Java',
    ['java.util.List<String> items = java.util.List.of("X", "Y", "Z");', 'items.forEach(System.out::println);'],
    ['使用 List.of 创建不可变列表。', 'forEach 传入方法引用逐行输出。'],
  ),
  challenge(
    'java-switch-expr', 'Switch 表达式', '使用 switch 表达式将数字映射为文字。',
    'Java',
    ['int day = 3;', 'String name = switch (day) {', '    case 1 -> "周一";', '    case 2 -> "周二";', '    case 3 -> "周三";', '    default -> "未知";', '};', 'System.out.println(name);'],
    ['定义代表星期几的整数。', 'switch 表达式的值赋给字符串变量。', 'case 1 映射为周一。', 'case 2 映射为周二。', 'case 3 映射为周三。', '其他情况映射为未知。', '结束 switch 表达式。', '输出对应的中文名称。'],
  ),
  challenge(
    'java-count-v2', '统计及格人数', '遍历数组统计大于等于六十的人数。',
    'Java',
    ['int[] scores = {55, 72, 60, 43, 88};', 'int passCount = 0;', 'for (int s : scores) {', '    if (s >= 60) passCount++;', '}', 'System.out.println(passCount + " 人及格");'],
    ['创建包含及格和不及格的成绩数组。', '初始化及格计数器为零。', '增强 for 遍历每个分数。', '大于等于六十时计数加一。', '结束循环。', '输出及格人数。'],
  ),
]

const detailedExplanationLineMaps: Record<string, number[]> = {
  'python-dict-iterate': [0, 1, 2, 3, 3, 4, 5],
  'python-func-params': [0, 1, 1, 2, 2, 2, 2, 3, 3, 4, 5],
  'python-try-except': [0, 1, 2, 3, 4, 5, 5, 6, 7],
  'js-for-loop-types': [0, 1, 1, 2, 3, 4, 4, 5, 5, 6, 6, 7, 8],
  'js-arrow-func': [0, 0, 1, 2, 3, 3, 3, 3, 4, 4, 5],
  'js-map-filter-reduce': [0, 0, 0, 0, 0, 1, 2, 3, 4, 5],
  'js-find-some': [0, 0, 0, 0, 0, 1, 2, 3, 4],
  'js-promise-basic': [0, 1, 1, 2, 3, 4],
  'java-enhanced-for': [0, 1, 2, 3, 3, 4, 5],
  'java-while-do-while': [0, 1, 2, 3, 4, 4, 5],
  'java-array-basics': [0, 1, 2, 3, 4, 5, 5],
  'java-hashmap': [0, 1, 2, 3, 4, 5, 5, 6, 6, 6],
  'java-method-return': [0, 1, 2, 3, 4, 5, 3],
  'java-if-else-chain': [0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6],
}

const detailedChallenges: Challenge[] = detailedChallengeData.map((item) => {
  const lineMap =
    detailedExplanationLineMaps[item.id] ??
    item.code.map((_, index) => index)

  if (lineMap.length !== item.code.length) {
    throw new Error(`${item.id} 的逐行解释映射数量不正确`)
  }

  return {
    ...item,
    id: `detailed-${item.id}`,
    source: 'detailed',
    explanations: lineMap.map((explanationIndex) => {
      const explanation = item.explanations[explanationIndex]
      if (!explanation) {
        throw new Error(`${item.id} 缺少第 ${explanationIndex + 1} 组解释`)
      }
      return explanation
    }),
  }
})

function validateChallenges(challenges: Challenge[]) {
  const ids = new Set<string>()
  for (const item of challenges) {
    if (ids.has(item.id)) throw new Error(`题目 ID 重复：${item.id}`)
    if (item.code.length !== item.explanations.length) {
      throw new Error(`${item.id} 的代码行与解释数量不一致`)
    }
    ids.add(item.id)
  }
}

export const challengesByLanguage: Record<Language, Challenge[]> = {
  Python: [
    ...detailedChallenges.filter((item) => item.language === 'Python'),
    ...pythonChallenges,
  ],
  JavaScript: [
    ...detailedChallenges.filter((item) => item.language === 'JavaScript'),
    ...jsChallenges,
  ],
  Java: [
    ...detailedChallenges.filter((item) => item.language === 'Java'),
    ...javaChallenges,
  ],
}

validateChallenges(Object.values(challengesByLanguage).flat())

export const TOTAL_CHALLENGES = Object.values(challengesByLanguage).reduce(
  (total, challenges) => total + challenges.length,
  0,
)
