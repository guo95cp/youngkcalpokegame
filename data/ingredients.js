// 파일명은 trays/ 와 ingredients/ 폴더에서 동일합니다.
// P두부는 이름을 유지하되 3단계 토핑에 배치합니다.
window.INGREDIENT_STAGES = [
  {
    name: "야채",
    items: [
      "V구운야채믹스",
      "V깻잎",
      "V스리라차양배추",
      "V야채",
      "V양파",
      "V적채",
      "V토마토",
      "V할라피뇨",
    ],
  },
  {
    name: "토핑",
    items: [
      "T두부",
      "T계란",
      "T김가루",
      "T무설탕김치",
      "T날치알",
      "T아보카도",
      "T양파후레이크",
      "T옥수수",
      "T치즈",
    ],
  },
  { name: "탄수화물", items: ["C메밀면", "C현미밥"] },
  {
    name: "메인토핑",
    items: [
      "P닭가슴살",
      "P닭다리살",
      "P부채살",
      "P안심",
      "P연어",
      "P오리고기",
      "P우삼겹",
      "P저당갈비",
    ],
  },
];
// size는 그릇 캔버스 너비에 대한 비율입니다. 필요하면 재료별로 조정하세요.
window.INGREDIENTS = Object.fromEntries(
  window.INGREDIENT_STAGES.flatMap((s) => s.items).map((id) => [
    id,
    {
      id,
      name: id.slice(1),
      tray: `images/trays/${id}.png`,
      food: `images/ingredients/${id}.png`,
      size: id.startsWith("C")
        ? 0.43
        : id === "P두부"
          ? 0.29
          : id.startsWith("P")
            ? 0.35
            : 0.27,
    },
  ]),
);
