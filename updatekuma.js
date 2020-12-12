import cheerio from "https://code4sabae.github.io/js/cheerio.js";
import { fetchTextViaCurl } from "https://code4sabae.github.io/js/fetchViaCurl.js";
import { fix0 } from "https://code4sabae.github.io/js/fix0.js";
import { CSV } from "https://code4sabae.github.io/js/CSV.js";

const getPath = (url) => url.substring(url.lastIndexOf("/") + 1);

const existsSync = async (path) => {
  try {
    await Deno.readFile(path);
    return true;
  } catch (e) {
  }
  return false;
};

const fnurlmap = "data/urlmap.json";

const updateFiles = async () => {
  const baseurl = "https://www.city.sabae.fukui.jp";
  const url = "https://www.city.sabae.fukui.jp/anzen_anshin/chojuhigaitaisaku/kuma-taisaku/kumasyutubotu/index.html";
  const text = await fetchTextViaCurl(url);
  const dom = cheerio.load(text);
  
  const map = {};
  for (const atag of Array.from(dom(".norcor a"))) {
    const url = baseurl + dom(atag).attr("href");
    const path = "data/" + getPath(url);
    map[path] = url;
    if (!await existsSync(path)) {
      console.log(url);
      await fetchTextViaCurl(url);
    }
  }
  await Deno.writeTextFile(fnurlmap, JSON.stringify(map));
};

// await updateFiles();

const parseOne = (dom, place) => {
  return dom(Array.from(dom(place))[0]);
};

const parseYear = (s) => {
  if (s.indexOf("令和元年") >= 0) {
    return 2019;
  }
  const n = s.match(/(平成|令和)(\d+)年/);
  if (!n) {
    console.log("title" + s);
    return 2020;
  }
  if (n[1] === "平成") {
    return 1988 + parseInt(n[2]);
  } else if (n[1] === "令和") {
    return 2018 + parseInt(n[2]);
  }
  return null;
};

const parseDate = (year, s) => { // 9月26日（土曜日）午前9時20分
  {
    const n = s.match(/(\d+)月(\d+)日（(.)曜日）\s*(午前|午後)(\d+)時(\d+)分/);
    if (n) {
      const d = (n[4] === "午後" ? 12 : 0) + parseInt(n[5]);
      const m = parseInt(n[6]);
      const dt = year + "-" + fix0(parseInt(n[1]), 2) + "-" + fix0(parseInt(n[2]), 2) + "T" + fix0(d, 2) + ":" + fix0(m, 2);;
      return dt;
    }
  }
  {
    const n = s.match(/(\d+)月(\d+)日(.)曜日\s*(午前|午後)(\d+)時(\d+)分/);
    if (n) {
      const d = (n[4] === "午後" ? 12 : 0) + parseInt(n[5]);
      const m = parseInt(n[6]);
      const dt = year + "-" + fix0(parseInt(n[1]), 2) + "-" + fix0(parseInt(n[2]), 2) + "T" + fix0(d, 2) + ":" + fix0(m, 2);;
      return dt;
    }
  }
  {
    const n = s.match(/(\d+)月(\d+)日（(.)曜日）\s*(午前|午後)(\d+)時/);
    if (n) {
      const d = (n[4] === "午後" ? 12 : 0) + parseInt(n[5]);
      const m = 0;
      const dt = year + "-" + fix0(parseInt(n[1]), 2) + "-" + fix0(parseInt(n[2]), 2) + "T" + fix0(d, 2) + ":" + fix0(m, 2);;
      return dt;
    }
  }
  {
    const n = s.match(/(\d+)月(\d+)日/);
    if (n) {
      const dt = year + "-" + fix0(parseInt(n[1]), 2) + "-" + fix0(parseInt(n[2]), 2);
      return dt;
    }
  }
};

const parseLL = (scr) => {
  const n = scr.match(/addMarker\(([0-9a-z_]+),\"(\d+\.\d+)\",\"(\d+\.\d+)\"/);
  if (!n) {
    console.log(scr);
    return null;
  }
  return [n[2], n[3]];
};

const parseKuma = (html) => {
  const dom = cheerio.load(html);
  const stitle = parseOne(dom, "#main .h1img_1 h1").text();
  const year = parseYear(stitle);
  const title = stitle; // stitle.substring(stitle.indexOf("　") + 1);
  let confirmdt = null;
  let kumainfo = null;
  let notice = null;
  let contact = null;
  let type = null;
  let maxp = null;
  for (const ptag of Array.from(dom("#main p"))) {
    const p = dom(ptag).text();
    console.log(p);
    const dt = parseDate(year, p);
    if (dt) {
      confirmdt = dt;
    }
    if (!maxp) {
      maxp = p;
    } else if (p.length > maxp.length) {
      maxp = p;
    }
    const n = p.indexOf("連絡事項：");
    if (n >= 0) {
      notice = p.substring(n + 5);
      const types = ["目撃情報", "目撃場所", "痕跡情報", "出没情報"];
      for (const t of types) {
        const m = p.indexOf(t + "：");
        if (m >= 0) {
          type = t;
          kumainfo = p.substring(m + 5, n);
          break;
        }
      }
    } else {
      const n = p.indexOf("連絡事項　");
      if (n >= 0) {
        notice = p.substring(n + 5);
        const types = ["目撃情報", "目撃場所", "痕跡情報", "出没情報"];
        for (const t of types) {
          const m = p.indexOf(t + "　");
          if (m >= 0) {
            type = t;
            kumainfo = p.substring(m + 5, n);
            break;
          }
        }
      } else if (p.indexOf("【目撃】") >= 0) {
        type = "目撃";
        kumainfo = p;
      } else if (p.indexOf("くま目撃") >= 0) {
        type = "目撃";
        kumainfo = p;
      } else if (title === "3月4日 長泉寺山遊歩道（西山公園北側の山中）でのクマ目撃情報への対応について（3月19日 立入制限解除）") {
        type = "対応";
        kumainfo = p;
      }
    }
    const n2 = p.indexOf("TEL");
    if (n2 >= 0) {
      contact = "鯖江市役所 "  + p.substring(0, p.indexOf("　"));
    }
  }
  if (!kumainfo) {
    kumainfo = maxp;
    type = "目撃";
    console.log(title);
    // Deno.exit(0);
  }
  const scr = parseOne(dom, "#main .mapimg script").text();
  const data = {
    "schema:category": "https://code4sabae.github.io/kuma/",
    "schema:provider": contact,
    "kuma:type": type, "schema:name": title,
    "kuma:confirmedTime": confirmdt,
    "schema:description": kumainfo,
    "schema:comment": notice,
  };
  const ll = parseLL(scr);
  if (ll) {
    data["schema:latitude"] = ll[0];
    data["schema:longitude"] = ll[1];
  }
  return data;
};

const map = JSON.parse(await Deno.readTextFile(fnurlmap));
const files = Deno.readDirSync("data/");
const json = [];
for (const f of files) {
  if (f.isDirectory || f.name === "index.html" || !f.name.endsWith(".html")) {
    continue;
  }
  const fn = "data/" + f.name;
  const html = await Deno.readTextFile(fn);
  console.log(fn);
  const data = parseKuma(html);
  data["schema:url"] = map[fn];
  console.log(data.url);
  json.push(data);
  console.log(data);
}

json.sort((a, b) => {
  const ad = new Date(a.confirmdt).getTime();
  const bd = new Date(b.confirmdt).getTime();
  console.log(ad, bd);
  return ad - bd;
});
console.log(json);

await Deno.writeTextFile("docs/kuma-sabae.json", JSON.stringify(json));
await Deno.writeTextFile("docs/kuma-sabae.csv", CSV.encode(CSV.fromJSON(json)));

