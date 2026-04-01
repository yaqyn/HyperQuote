> ⚠️ **REFERENCE DOCUMENT — NOT THE SOURCE OF TRUTH**
> This file was written during the research phase and may contain outdated decisions, US-centric references, or superseded technical choices.
> **Always defer to `essential/RESEARCH.md` for current decisions.**
> Key changes since this file was written: TanStack Start (not Next.js), Capacitor (not Expo), React Aria (not shadcn), Egyptian law (not US FMCSA), EGP (not USD), dual auth pools, no online payments, no mobile wallets, spatial glass UI (not traditional dashboards).

# Research: Mistral OCR for B2B Building Materials Catalog Parsing

**Date:** March 2026
**Context:** Evaluating whether Mistral OCR can handle Arabic+English supplier catalog parsing for a B2B building materials platform (Egypt-based)

---

## 1. What Is Mistral OCR?

Mistral OCR is a **dedicated OCR product/API** from Mistral AI -- it is NOT just their vision models (Pixtral). It is a purpose-built document parsing service.

### Timeline:
- **March 2025:** Mistral OCR v1 launched (`mistral-ocr-2503`) -- first dedicated OCR API
- **Mid 2025:** Mistral OCR 2 released
- **December 2025:** Mistral OCR 3 released (`mistral-ocr-2512`) -- current version

### What it does:
- Dedicated `/v1/ocr` REST API endpoint (separate from chat/vision)
- Takes PDFs and images as input
- Outputs **Markdown with HTML tables** preserving document structure
- Extracts interleaved text and embedded images
- Supports structured JSON output via annotation parameters
- Can process specific pages of a PDF
- Table output in markdown or HTML format (with `colspan`/`rowspan`)

### Key distinction:
Mistral OCR is a **specialized model** -- smaller and faster than their Pixtral vision models, optimized specifically for document parsing. It is NOT the same as using Pixtral for vision tasks.

---

## 2. Mistral Pixtral Vision Models (Separate from OCR)

Pixtral is Mistral's general vision model line -- different from their OCR product:

- **Pixtral 12B** (deprecated) -- 12B parameter multimodal model
- **Pixtral Large 25.02** -- 124B parameter multimodal model, 128K context window
  - Strong on DocVQA, ChartQA benchmarks
  - Outperformed GPT-4o and Gemini 1.5 Pro on document QA tasks
  - Processes images at natural resolution/aspect ratio

**For catalog parsing, Mistral OCR (not Pixtral) is the right tool.** Pixtral is for general vision tasks; OCR is optimized for document extraction.

---

## 3. Mistral OCR Accuracy -- Benchmarks

### Official Mistral OCR 3 Benchmarks (December 2025):

| Category | Mistral OCR 3 | AWS Textract | Azure Doc AI | Google Doc AI | DeepSeek OCR |
|---|---|---|---|---|---|
| **Complex Tables** | **96.6%** | 84.8% | 85.9% | -- | -- |
| **Forms** | **95.9%** | 84.5% | 86.2% | -- | -- |
| **Handwriting** | **88.9%** | -- | 78.2% | 73.9% | 57.2% |
| **Historical Scans** | **96.7%** | -- | 83.7% | 87.1% | 81.1% |
| **English Text** | **98.6%** | 93.9% | 93.5% | -- | -- |
| **Overall** | ~94.9% | -- | 89.5% | 83.4% | -- |

### OCR 3 vs OCR 2:
- 74% win rate over OCR 2 across forms, scanned documents, complex tables, and handwriting

### Independent Testing Reality Check:

**CRITICAL CAVEATS -- Real-world testing reveals significant gaps:**

1. **Hallucinations are a real problem:**
   - Repeats table content with incorrect headers/captions
   - "Guesses" missing information in partially readable text
   - Adds, removes, or changes words randomly
   - Multi-column hallucinations -- forces table structures onto non-tabular text

2. **Financial document issues:**
   - 17% column misalignment in complex tables
   - +/-1.5% average numerical precision deviation
   - Critical failures with parenthetical notation for negative values

3. **Checkbox/form issues:**
   - Virtually nonexistent checkbox detection in dense questionnaires
   - Multi-line cell content frequently merged or truncated

4. **Format inconsistencies:**
   - JPEG vs PDF handling inconsistencies
   - Some PDF pages mistakenly treated as images
   - Extracting from image versions sometimes works better than PDFs

5. **Meaningful discrepancy between Mistral's reported accuracy and independent test results**

---

## 4. Pricing -- Dramatically Cheaper Than Claude

### Mistral OCR 3 Pricing:
| Tier | Cost |
|---|---|
| **Standard OCR** | $2 per 1,000 pages |
| **Batch API** (50% discount) | $1 per 1,000 pages |
| **Annotated pages** (structured JSON) | $3 per 1,000 pages |

### Cost Comparison:

| Service | Cost per 1,000 pages | vs Mistral OCR |
|---|---|---|
| **Mistral OCR 3 (batch)** | **$1** | baseline |
| **Mistral OCR 3 (standard)** | **$2** | -- |
| **Mistral OCR 3 (annotated)** | **$3** | -- |
| Claude Vision (estimated) | ~$90 ($0.45/200pg = $2.25/1000pg for tokens alone, but real cost higher with reasoning) | ~45-90x more |
| AWS Textract | ~$65 | ~33-65x more |
| Google Document AI | ~$30 | ~15-30x more |
| Azure Form Recognizer | ~$8-50 | ~4-25x more |

**Mistral OCR is 15-97% cheaper than alternatives.** This is its strongest selling point.

### For our platform (estimated 50,000 pages/month of catalogs):
- Mistral OCR batch: **$50/month**
- Mistral OCR annotated: **$150/month**
- Claude Vision: **$2,250-4,500/month**

---

## 5. Cloudflare Integration

### Cloudflare AI Gateway -- YES, Supports Mistral:
- Mistral is an **officially supported provider** in Cloudflare AI Gateway
- Endpoint: `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/mistral/v1/chat/completions`
- Also supports OpenAI-compatible endpoint for Mistral models
- Features: edge caching, rate limiting, real-time logging, cost tracking
- 2026 unified billing allows paying for Mistral through Cloudflare invoice

### Cloudflare Workers AI -- LIMITED Mistral Support:
- Only `mistral-7b-instruct-v0.1` available on Workers AI directly
- **Mistral OCR is NOT available on Workers AI** -- it's a SaaS-only API
- You must call Mistral's OCR API externally (through AI Gateway or direct)

### TanStack AI / Vercel AI SDK:
- Mistral is a supported provider in Vercel AI SDK (`@ai-sdk/mistral`)
- This covers chat/completion models, NOT the OCR endpoint
- The OCR endpoint (`/v1/ocr`) would need direct REST calls

### Architecture for our platform:
```
Cloudflare Worker -> AI Gateway -> Mistral OCR API (direct REST)
                                -> Groq (for chat/reasoning)
                                -> Claude (fallback for complex cases)
```

---

## 6. Arabic Text Support -- CRITICAL FOR EGYPT

### What Mistral claims:
- Supports "thousands of scripts, fonts, and languages"
- Arabic explicitly mentioned as a supported language
- Claims 97-99.5% accuracy across 11+ languages
- One user reported "accuracy close to 99% across multiple Arabic PDFs"

### Reality check:
- Arabic is listed as supported but **no published Arabic-specific benchmarks** from Mistral
- The 99% Arabic claim comes from a single user report, not systematic testing
- No explicit mention of RTL (right-to-left) table handling in documentation
- No published benchmarks for **mixed Arabic+English** in the same document
- No published benchmarks for Arabic in complex tables

### What this means for Egyptian supplier catalogs:
- **High risk area.** Arabic OCR support exists but is not well-documented
- Mixed Arabic+English catalogs (common in Egyptian building materials) are an untested edge case
- RTL text inside table cells with English product codes = potential layout confusion
- **Must run our own benchmarks** before committing to Mistral OCR for Arabic catalogs

### Recommendation:
Run a pilot test with 20-30 real Egyptian supplier catalogs covering:
- Pure Arabic text catalogs
- Mixed Arabic headers + English product codes
- Arabic text in table cells
- Scanned vs digital PDF Arabic content
- Arabic handwritten annotations

---

## 7. Mistral OCR vs Claude Vision -- Head-to-Head for Catalog Parsing

### For Building Materials Catalogs Specifically:

| Capability | Mistral OCR 3 | Claude Vision (Sonnet 4) |
|---|---|---|
| **Table extraction** | 96.6% (strong) | Very strong, excels at complex layouts |
| **Multi-column layouts** | Good but hallucination risk | Excellent, strong layout understanding |
| **Scanned catalogs** | 96.7% on historical scans | Good but slower |
| **Arabic text** | Claimed support, limited evidence | Strong multilingual, Arabic tested |
| **Mixed Arabic+English** | Untested publicly | Better documented multilingual handling |
| **Structured JSON output** | Yes, via annotation API | Yes, via tool use / structured output |
| **Price (1000 pages)** | $1-3 | ~$90+ |
| **Speed** | 2,000 pages/min per node | Much slower |
| **Hallucination risk** | HIGHER -- documented issues | LOWER -- better reasoning prevents hallucination |
| **Complex reasoning about data** | OCR only, no reasoning | Can reason about what it sees |
| **Batch processing** | Native batch API | No native batch |

### Key differences:

**Mistral OCR wins on:**
- Price (30-90x cheaper)
- Speed (much faster)
- Raw text extraction accuracy for clean documents
- Table structure preservation (HTML output)

**Claude Vision wins on:**
- Complex reasoning about extracted data
- Handling ambiguous/damaged documents (fewer hallucinations)
- Mixed language documents (better documented)
- Understanding context and semantics
- Structured data extraction with business logic
- Fewer "confident but wrong" outputs

---

## 8. API Integration Details

### Mistral OCR API:

**Endpoint:** `POST https://api.mistral.ai/v1/ocr`

**Request:**
```json
{
  "model": "mistral-ocr-2512",
  "document": {
    "type": "document_url",
    "document_url": "https://example.com/catalog.pdf"
  },
  "pages": [0, 1, 2],
  "table_format": "html",
  "include_image_base64": false,
  "document_annotation_format": {
    "type": "json_schema",
    "json_schema": { ... }
  }
}
```

**Response:**
```json
{
  "pages": [
    {
      "index": 0,
      "markdown": "# Product Catalog\n\n<table>...</table>",
      "images": [...],
      "dimensions": { "dpi": 300, "height": 3300, "width": 2550 }
    }
  ],
  "model": "mistral-ocr-2512",
  "usage_info": { "pages_processed": 3, "doc_size_bytes": 1234567 }
}
```

### SDKs:
- **Python:** `mistralai` package -- `mistral.ocr.process()`
- **TypeScript:** `@mistralai/mistralai` -- `mistral.ocr.process()`
- **Vercel AI SDK:** `@ai-sdk/mistral` (chat models only, NOT OCR)

### Structured Output:
- `document_annotation_format` supports `json_schema` for structured extraction
- Can define a JSON Schema and get structured data back (similar to Claude's tool use)
- Annotated pages cost $3/1000 pages vs $2/1000 for basic OCR

---

## 9. Real-World Production Usage

### Who's using it:
- **Financial services:** Banks processing invoices, AML/KYC document digitization
- **Healthcare:** Medical document processing (Mistral has a healthcare cookbook)
- **Enterprise:** Company archive digitization, technical report extraction
- **Legal:** Contract parsing (with noted checkbox detection issues)

### What results they report:
- Fast processing (2,000 pages/min)
- Good for straightforward document types
- **Human-in-the-loop verification still needed** for financial/compliance data
- Hallucination risk means manual review is essential for critical data

### No B2B/building materials specific examples found.
No logistics or supply chain specific case studies published.

---

## 10. Can Mistral OCR Replace Claude for Catalog Parsing?

### HONEST ASSESSMENT: Partially, but not fully.

### What Mistral OCR CAN replace Claude for:
1. **Bulk text extraction** from clean digital PDFs -- yes, absolutely
2. **Table structure extraction** from well-formatted catalogs -- yes, cheaper and faster
3. **Image-based text extraction** from scanned documents -- yes, good accuracy
4. **First-pass catalog digitization** -- extract raw content before further processing

### What Mistral OCR CANNOT replace Claude for:
1. **Reasoning about extracted data** -- Mistral OCR extracts text, it doesn't understand it
2. **Handling ambiguous/damaged catalogs** -- higher hallucination risk
3. **Mixed Arabic+English confidence** -- not enough evidence for our use case
4. **Business logic extraction** -- "Is this a bulk price? What's the unit?" requires reasoning
5. **Error correction** -- Claude can catch its own mistakes, OCR cannot

### Recommended Hybrid Architecture:

```
Supplier Catalog (PDF/Image)
         |
         v
  [Mistral OCR 3] -- $1-3/1000 pages
  Extract raw text + tables + structure
         |
         v
  [Groq + GLM-4 or Llama] -- fast + cheap
  Structure extracted text into product schema
  Parse pricing, specs, units, categories
         |
         v
  [Claude Vision] -- ONLY for failures/edge cases
  - When Arabic text confidence is low
  - When table structure is ambiguous
  - When scanned quality is poor
  - When hallucination is suspected
  (~5-10% of catalogs, not all)
```

### Cost projection with hybrid approach:
- 50,000 pages/month total
- Mistral OCR for all: $50-150/month
- Groq for structuring: ~$10-20/month
- Claude for 5-10% edge cases (~2,500-5,000 pages): ~$225-450/month
- **Total: ~$285-620/month** vs $2,250-4,500/month for Claude-only

### BOTTOM LINE:

**Mistral OCR is real, production-ready, and dramatically cheaper.** It should be the first layer of catalog processing. But it is NOT a complete replacement for Claude in a building materials platform with Arabic+English catalogs because:

1. **Arabic support is inadequately documented** -- must test ourselves
2. **Hallucinations in tables** are a real risk for pricing data (17% column misalignment in complex tables)
3. **No reasoning capability** -- it extracts text, doesn't understand product semantics
4. **Numerical precision issues** (+/-1.5% deviation) are unacceptable for pricing

The optimal strategy is **Mistral OCR as the extraction layer + LLM reasoning on top + Claude as quality fallback**, not Mistral OCR as a standalone replacement.

---

## Sources

- [Mistral OCR Official Announcement](https://mistral.ai/news/mistral-ocr)
- [Mistral OCR 3 Release (Dec 2025)](https://mistral.ai/news/mistral-ocr-3)
- [Mistral OCR 3 Model Docs](https://docs.mistral.ai/models/ocr-3-25-12)
- [Mistral OCR API Endpoint](https://docs.mistral.ai/api/endpoint/ocr)
- [Mistral Document AI](https://mistral.ai/solutions/document-ai)
- [Mistral OCR 3 Technical Review - PyImageSearch](https://pyimagesearch.com/2025/12/23/mistral-ocr-3-technical-review-sota-document-parsing-at-commodity-pricing/)
- [Beyond the Hype: Real-World Tests - Pulse AI](https://www.runpulse.com/blog/beyond-the-hype-real-world-tests-of-mistrals-ocr)
- [Mistral OCR Tested: Pros & Cons - Parsio](https://parsio.io/blog/mistral-ocr-test-review/)
- [Mistral OCR vs Gemini Flash 2.0 - Reducto](https://reducto.ai/blog/lvm-ocr-accuracy-mistral-gemini)
- [Is Mistral OCR 3 the Best OCR Model? - Analytics Vidhya](https://www.analyticsvidhya.com/blog/2025/12/mistral-ocr-3/)
- [OCR 3 Cuts Document AI Costs 97% - ByteIota](https://byteiota.com/mistral-ocr-3-2-1000-pages-cuts-document-ai-costs-97/)
- [Mistral OCR 3 Launch - VentureBeat](https://venturebeat.com/infrastructure/mistral-launches-ocr-3-to-digitize-enterprise-documents-touts-74-win-rate)
- [Experts React to Mistral OCR - Slator](https://slator.com/experts-react-mistral-ocr-new-multilingual-text-processing-tool/)
- [Cloudflare AI Gateway - Mistral Provider](https://developers.cloudflare.com/ai-gateway/usage/providers/mistral/)
- [Mistral on Cloudflare Workers](https://docs.mistral.ai/deployment/self-deployment/cloudflare)
- [Vercel AI SDK - Mistral Provider](https://ai-sdk.dev/providers/ai-sdk-providers/mistral)
- [DeepSeek OCR vs Mistral OCR Benchmark](https://sparkco.ai/blog/deepseek-ocr-vs-mistral-ocr-benchmark-analysis-2025)
- [Best OCR Models 2026 - CodeSOTA](https://www.codesota.com/ocr)
- [Mistral OCR Review - Medium](https://medium.com/intelligent-document-insights/mistral-ocr-reviewed-711765a9c503)
- [Mistral OCR 3 - MarkTechPost](https://www.marktechpost.com/2025/12/19/mistral-ai-releases-ocr-3-a-smaller-optical-character-recognition-ocr-model-for-structured-document-ai-at-scale/)
