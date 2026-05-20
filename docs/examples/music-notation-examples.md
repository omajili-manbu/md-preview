# 乐谱渲染示例

本页面展示如何使用 Markdown 预览器嵌入乐谱，支持 ABC 记谱法和 MusicXML 格式。

---

## 1. ABC 记谱法

ABC 记谱法是一种简洁的文本音乐记谱格式，使用 `abcjs` 库进行渲染。

### 简单旋律 - 小星星

**源码：**
```txt
X:1
T:小星星
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |
w:Twinkle twinkle little star How I wonder what you are
```

**渲染效果：**

```abc
X:1
T:小星星
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |
w:Twinkle twinkle little star How I wonder what you are
```

---

### 复杂和声

**源码：**
```txt
X:2
T:欢乐颂
M:4/4
L:1/8
K:G
BA G2 B2 | A2 G2 A2 | B2 A2 G2 | F2 E2 D2 |
w:欢乐女神圣洁美丽灿烂光芒照大地
```

**渲染效果：**

```abc
X:2
T:欢乐颂
M:4/4
L:1/8
K:G
BA G2 B2 | A2 G2 A2 | B2 A2 G2 | F2 E2 D2 |
w:欢乐女神圣洁美丽灿烂光芒照大地
```

---

### 多声部音乐

**源码：**
```txt
X:3
T:二重奏示例
M:3/4
L:1/4
K:D
V:1
DEF | GAB | c2d |
V:2
D2D | D2D | A2A |
```

**渲染效果：**

```abc
X:3
T:二重奏示例
M:3/4
L:1/4
K:D
V:1
DEF | GAB | c2d |
V:2
D2D | D2D | A2A |
```

---

## 2. MusicXML 格式

MusicXML 是一种基于 XML 的音乐符号标准格式，使用 `Verovio` 库进行渲染。

### 简单音符

**源码：**
```musicxml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>F</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>
```

**渲染效果：**

```musicxml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>F</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>
```

---

### 带升降号的音符

**源码：**
```musicxml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>1</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>F</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>
```

**渲染效果：**

```musicxml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>1</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>F</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>
```

---

## 3. OSMD（OpenSheetMusicDisplay）

OSMD 是另一个强大的 MusicXML 渲染库，提供更现代化的渲染效果和交互功能。

### 简单音符

**源码：**
```txt
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>F</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>
```

**渲染效果：**

```osmd
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>0</fifths>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
      </attributes>
      <note>
        <pitch>
          <step>C</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>E</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch>
          <step>F</step>
          <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>
```

---

## 4. 使用说明

### 语法格式

**ABC 记谱法：**
```markdown
```abc
X:1
T:标题
M:4/4
K:C
C D E F |
```
```

**MusicXML - Verovio：**
```markdown
```musicxml
<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <!-- 乐谱内容 -->
</score-partwise>
```
```

**MusicXML - OSMD：**
```markdown
```osmd
<?xml version="1.0" encoding="UTF-8"?>
<score-partwise>
  <!-- 乐谱内容 -->
</score-partwise>
```
```

### 支持的格式

| 格式 | 代码块类型 | 渲染库 | 特点 |
|------|-----------|--------|------|
| ABC 记谱法 | `abc` | abcjs | 简洁的文本音乐格式，适合民谣和简单旋律 |
| MusicXML | `musicxml` | Verovio | 轻量级渲染，快速加载 |
| MusicXML | `osmd` | OSMD | 现代化渲染，丰富的符号和交互功能 |

### 乐谱库对比

#### abcjs（ABC 记谱法）
- **优点**：语法简洁，学习曲线低，轻量级
- **缺点**：功能有限，不支持复杂的音乐符号
- **适用场景**：简单的旋律、民谣、教学示例

#### Verovio（MusicXML 渲染）
- **优点**：渲染速度快，支持 MEI 格式，体积小
- **缺点**：界面较基础，交互功能有限
- **适用场景**：快速预览 MusicXML 文件

#### OSMD（OpenSheetMusicDisplay）
- **优点**：现代化的渲染效果，丰富的音乐符号，支持多种交互功能
- **缺点**：库体积较大，加载时间较长
- **适用场景**：专业的音乐文档、完整的乐谱展示

### ABC 记谱法基本元素

- `X:` - 参考号
- `T:` - 标题
- `M:` - 节拍
- `L:` - 默认音符长度
- `K:` - 调号
- `V:` - 声部

### MusicXML 基本结构

- `<score-partwise>` - 乐谱根元素
- `<part-list>` - 声部列表
- `<part>` - 单个声部
- `<measure>` - 小节
- `<note>` - 音符
- `<attributes>` - 乐谱属性（调号、节拍等）

---

## 5. 注意事项

1. **ABC 记谱法**：适合简单的旋律和民谣音乐，语法简洁易读
2. **MusicXML - Verovio**：适合快速预览 MusicXML 文件，轻量级渲染
3. **MusicXML - OSMD**：适合专业的乐谱展示，现代化的渲染效果和丰富的交互功能
4. 代码块前的 `txt` 和 `musicxml/osmd` 标记用于显示源码，实际渲染时会被各自的渲染器处理
5. 所有 MusicXML 代码块都支持 Verovio 和 OSMD 两种渲染方式，只需将代码块类型改为对应的名称即可
