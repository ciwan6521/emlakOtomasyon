import { definePack } from "../pack";

const en = {
  // Social page
  "social.propertyIdLabel": "Property ID (optional, for AI caption)",
  "social.propertyIdPlaceholder": "Property UUID",
  "social.caption": "Caption",
  "social.captionPlaceholder": "Write or generate a caption…",
  "social.aiCaption": "AI caption",
  "social.aiCaptionHint": "Enter a property ID to generate a caption",
  "social.generating": "Generating…",
  "social.createPost": "Create post",
  "social.scheduledAt": "Scheduled {time}",
  "social.empty": "No posts yet. Publishing a property auto-creates posts.",

  // Communication page (campaigns tab)
  "commsPage.createCampaign": "Create campaign",
  "commsPage.campaignName": "Campaign name",
  "commsPage.campaignNamePlaceholder": "Spring buyers outreach",
  "commsPage.template": "Template",
  "commsPage.selectTemplate": "Select template",
  "commsPage.segmentOptional": "Segment (optional)",
  "commsPage.allSegments": "All segments",
  "commsPage.noSegmentFilter": "No segment filter",
  "commsPage.customerIds": "Customer IDs (optional, comma-separated)",
  "commsPage.customerIdsPlaceholder": "uuid-1, uuid-2, …",
  "commsPage.customerIdsHint":
    "Use segment or explicit customer IDs. If both are set, customer IDs take precedence.",
  "commsPage.propertyIdBroadcast": "Property ID (broadcast hint)",
  "commsPage.propertyIdBroadcastPlaceholder":
    "Property UUID to preview matched audience",
  "commsPage.matchedCustomers":
    "{n} matched customers for property broadcast",
  "commsPage.topMatches": "Top matches:",
  "commsPage.broadcastNote":
    "Publishing a property auto-dispatches a WhatsApp campaign to matched buyers.",
  "commsPage.noCampaigns": "No campaigns yet.",
} as const;

export const socialPack = definePack(en, {
  me: {
    "social.propertyIdLabel": "ID nekretnine (opciono, za AI opis)",
    "social.propertyIdPlaceholder": "UUID nekretnine",
    "social.caption": "Opis objave",
    "social.captionPlaceholder": "Napišite ili generišite opis…",
    "social.aiCaption": "AI opis",
    "social.aiCaptionHint": "Unesite ID nekretnine da biste generisali opis",
    "social.generating": "Generisanje…",
    "social.createPost": "Kreiraj objavu",
    "social.scheduledAt": "Zakazano {time}",
    "social.empty":
      "Još nema objava. Objavljivanje nekretnine automatski kreira objave.",

    "commsPage.createCampaign": "Kreiraj kampanju",
    "commsPage.campaignName": "Naziv kampanje",
    "commsPage.campaignNamePlaceholder": "Proljećna kampanja za kupce",
    "commsPage.template": "Šablon",
    "commsPage.selectTemplate": "Izaberite šablon",
    "commsPage.segmentOptional": "Segment (opciono)",
    "commsPage.allSegments": "Svi segmenti",
    "commsPage.noSegmentFilter": "Bez filtera po segmentu",
    "commsPage.customerIds": "ID-jevi kupaca (opciono, odvojeni zarezom)",
    "commsPage.customerIdsPlaceholder": "uuid-1, uuid-2, …",
    "commsPage.customerIdsHint":
      "Koristite segment ili eksplicitne ID-jeve kupaca. Ako su oba zadata, ID-jevi kupaca imaju prednost.",
    "commsPage.propertyIdBroadcast": "ID nekretnine (pregled publike)",
    "commsPage.propertyIdBroadcastPlaceholder":
      "UUID nekretnine za pregled uparene publike",
    "commsPage.matchedCustomers":
      "{n} uparenih kupaca za slanje o nekretnini",
    "commsPage.topMatches": "Najbolja poklapanja:",
    "commsPage.broadcastNote":
      "Objavljivanje nekretnine automatski pokreće WhatsApp kampanju ka uparenim kupcima.",
    "commsPage.noCampaigns": "Još nema kampanja.",
  },
  tr: {
    "social.propertyIdLabel": "Mülk ID (isteğe bağlı, AI açıklama için)",
    "social.propertyIdPlaceholder": "Mülk UUID",
    "social.caption": "Açıklama",
    "social.captionPlaceholder": "Bir açıklama yazın veya oluşturun…",
    "social.aiCaption": "AI açıklama",
    "social.aiCaptionHint": "Açıklama oluşturmak için bir mülk ID girin",
    "social.generating": "Oluşturuluyor…",
    "social.createPost": "Paylaşım oluştur",
    "social.scheduledAt": "Zamanlandı: {time}",
    "social.empty":
      "Henüz paylaşım yok. Bir mülk yayınlandığında paylaşımlar otomatik oluşturulur.",

    "commsPage.createCampaign": "Kampanya oluştur",
    "commsPage.campaignName": "Kampanya adı",
    "commsPage.campaignNamePlaceholder": "Bahar alıcı kampanyası",
    "commsPage.template": "Şablon",
    "commsPage.selectTemplate": "Şablon seçin",
    "commsPage.segmentOptional": "Segment (isteğe bağlı)",
    "commsPage.allSegments": "Tüm segmentler",
    "commsPage.noSegmentFilter": "Segment filtresi yok",
    "commsPage.customerIds": "Müşteri ID'leri (isteğe bağlı, virgülle ayrılmış)",
    "commsPage.customerIdsPlaceholder": "uuid-1, uuid-2, …",
    "commsPage.customerIdsHint":
      "Segment veya açık müşteri ID'leri kullanın. İkisi de girilirse müşteri ID'leri önceliklidir.",
    "commsPage.propertyIdBroadcast": "Mülk ID (hedef kitle önizlemesi)",
    "commsPage.propertyIdBroadcastPlaceholder":
      "Eşleşen kitleyi önizlemek için mülk UUID",
    "commsPage.matchedCustomers":
      "Mülk duyurusu için {n} eşleşen müşteri",
    "commsPage.topMatches": "En iyi eşleşmeler:",
    "commsPage.broadcastNote":
      "Bir mülk yayınlandığında eşleşen alıcılara otomatik olarak WhatsApp kampanyası gönderilir.",
    "commsPage.noCampaigns": "Henüz kampanya yok.",
  },
  ru: {
    "social.propertyIdLabel": "ID объекта (необязательно, для AI-описания)",
    "social.propertyIdPlaceholder": "UUID объекта",
    "social.caption": "Текст публикации",
    "social.captionPlaceholder": "Напишите или сгенерируйте текст…",
    "social.aiCaption": "AI-описание",
    "social.aiCaptionHint": "Введите ID объекта, чтобы сгенерировать текст",
    "social.generating": "Генерация…",
    "social.createPost": "Создать публикацию",
    "social.scheduledAt": "Запланировано {time}",
    "social.empty":
      "Публикаций пока нет. При публикации объекта они создаются автоматически.",

    "commsPage.createCampaign": "Создать кампанию",
    "commsPage.campaignName": "Название кампании",
    "commsPage.campaignNamePlaceholder": "Весенняя рассылка покупателям",
    "commsPage.template": "Шаблон",
    "commsPage.selectTemplate": "Выберите шаблон",
    "commsPage.segmentOptional": "Сегмент (необязательно)",
    "commsPage.allSegments": "Все сегменты",
    "commsPage.noSegmentFilter": "Без фильтра по сегменту",
    "commsPage.customerIds": "ID клиентов (необязательно, через запятую)",
    "commsPage.customerIdsPlaceholder": "uuid-1, uuid-2, …",
    "commsPage.customerIdsHint":
      "Укажите сегмент или явные ID клиентов. Если заданы оба, приоритет у ID клиентов.",
    "commsPage.propertyIdBroadcast": "ID объекта (предпросмотр аудитории)",
    "commsPage.propertyIdBroadcastPlaceholder":
      "UUID объекта для предпросмотра подобранной аудитории",
    "commsPage.matchedCustomers":
      "Подобрано клиентов для рассылки по объекту: {n}",
    "commsPage.topMatches": "Лучшие совпадения:",
    "commsPage.broadcastNote":
      "При публикации объекта подходящим покупателям автоматически отправляется WhatsApp-кампания.",
    "commsPage.noCampaigns": "Кампаний пока нет.",
  },
});
