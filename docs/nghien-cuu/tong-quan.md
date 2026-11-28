# Tổng quan nghiên cứu về phân loại mã HS tự động và sự khác biệt của phương pháp số hoá luật cho LLM đọc (M-82 / ADR-0011)

- **Ngày cập nhật:** 28/11/2026
- **Thuộc thẻ:** M-82 (`hs-code-api` #2483, [`ADR-0011`](../decisions/0011-doc-mot-lan-tu-chuong-xuong-8-so.md))
- **Mục đích:** Phần tổng quan tài liệu (*Literature Review / Related Work*) cho bài nghiên cứu khoa học về phương pháp số hoá hệ thống luật phân loại hàng hoá xuất nhập khẩu (HS) theo quy trình *"đọc một lần từ chương xuống dòng 8 số, mô hình mạnh phản biện điểm mơ hồ"* của OZ Việt Nam.

---

## 1. Đặt vấn đề: Bản chất pháp lý và cấu trúc phân cấp của bài toán phân loại mã HS

Hệ thống Hài hoà Mô tả và Mã hoá Hàng hoá (*Harmonized Commodity Description and Coding System* — viết tắt là **HS**) do Tổ chức Hải quan Thế giới (WCO) ban hành là ngôn ngữ pháp lý chung của thương mại quốc tế. Tại cấp độ quốc tế, mã HS gồm 6 chữ số (2 số đầu là **Chương**, 4 số là **Nhóm**, 6 số là **Phân nhóm**); từng quốc gia hoặc khu vực mở rộng thêm các chữ số cuối để định danh dòng thuế quốc gia (8 chữ số tại Việt Nam theo Danh mục AHTN/ASEAN; 10 chữ số tại Mỹ, Canada, Trung Quốc). Tại Việt Nam, biểu thuế xuất nhập khẩu hiện hành gồm **11.871 dòng mã 8 số** thuộc 97 chương và 1.269 nhóm 4 số.

Khác với bài toán phân loại danh mục sản phẩm thương mại điện tử thông thường (vốn dựa trên độ tương đồng ngữ nghĩa hoặc từ khoá bề mặt), phân loại mã HS là một bài toán **suy luận pháp lý phân cấp có ràng buộc chặt** (*constrained hierarchical legal reasoning*):

1. **Tuân thủ tuyệt đối trình tự 6 Quy tắc tổng quát (GIR 1–6):** Quy tắc 1 yêu cầu phân loại căn cứ vào nội dung tên nhóm và bất kỳ Chú giải Phần hoặc Chú giải Chương nào có liên quan. Chỉ khi Quy tắc 1 không giải quyết được mới tuần tự xét tới Quy tắc 2 (hàng chưa lắp ráp/hỗn hợp), Quy tắc 3(a)→3(b)→3(c) (nhóm đặc trưng nhất → đặc tính cơ bản → thứ tự số lớn nhất), Quy tắc 4, Quy tắc 5 (bao bì) và Quy tắc 6 (chỉ so sánh các phân nhóm **cùng cấp gạch** trong cùng một nhóm).
2. **Chi phối bởi mạng lưới mệnh đề loại trừ và định nghĩa chéo:** Trong biểu thuế Việt Nam, có tới **867 / 1.269 nhóm 4 số (68,3%)** chịu tác động của các mệnh đề loại trừ nằm ở Chú giải Phần, Chú giải Chương hoặc Chú giải chi tiết. Một mặt hàng khớp hoàn toàn về tên gọi với nhóm A vẫn có thể bị một câu chú giải ở đầu Phần đẩy sang nhóm B ở chương khác (ví dụ: Chú giải 2 Phần XVI quy định lộ trình phân loại bộ phận máy theo thứ tự 2(a) → 2(b) → 2(c); hoặc Chú giải 6(a) Chương 85 kéo thiết bị lưu trữ bán dẫn thể rắn sang nhóm `85.23` thay vì `84.71`).
3. **Bất đối xứng thông tin giữa mô tả thương mại và điều kiện luật:** Người khai hải quan thường chỉ cung cấp tên thương mại, công dụng chung hoặc mã model, trong khi ranh giới giữa các phân nhóm 6 số và dòng 8 số lại cắt theo các trục kỹ thuật ẩn (hàm lượng hợp kim, kích thước mặt cắt, áp suất vận hành, công nghệ hiển thị, phương pháp gia công) cùng hàng nghìn dòng vét cạn mang tên *"Loại khác"* (**3.357 / 11.871 dòng 8 số**, tức **28,3%** toàn biểu thuế Việt Nam).

Trong hơn một thập kỷ qua, các cơ quan hải quan, tổ chức quốc tế và giới học thuật đã thử nghiệm nhiều thế hệ công nghệ để tự động hoá bài toán này. Mục 2 dưới đây tổng hợp các công bố thực tế kèm phương pháp, cách đo, số liệu định lượng và các kiểu lỗi điển hình.

---

## 2. Tổng quan các nghiên cứu và hệ thống phân loại HS tự động trên thế giới

### 2.1. Báo cáo của WCO, hệ thống của Hải quan các nước và các cuộc thi

#### (a) Tổ chức Hải quan Thế giới (WCO) — Dự án BACUDA (AI-HS) và Báo cáo WCO/WTO
- **Nguồn & Đường dẫn:**
  - Dự án WCO BACUDA (*Band of Customs Data Analysts*): *HS Code Recommendation Algorithm (AI-HS)*, WCO Capacity Building / CLiKC! (`https://www.wcoomd.org/` và `https://bacuda.wcoomd.org/`).
  - Báo cáo chung WCO & WTO (2022): *WCO/WTO Study Report on Disruptive Technologies* và *The Role of Advanced Technologies in Cross-Border Trade: A Customs Perspective* (`https://www.wcoomd.org/en/topics/facilitation/instrument-and-tools/tools/study-report-on-disruptive-technologies.aspx`, `https://www.wto-ilibrary.org/`).
- **Phương pháp:** Nhóm chuyên gia BACUDA của WCO (hợp tác cùng Hải quan Hàn Quốc — CCF-Korea) xây dựng mô hình gợi ý mã HS dựa trên xử lý ngôn ngữ tự nhiên (NLP) truyền thống, sử dụng biểu diễn vector văn bản **`Doc2Vec`** kết hợp mạng nơ-ron đa lớp. Mô hình ánh xạ chuỗi mô tả hàng hoá trên tờ khai lịch sử của doanh nghiệp và mã HS đã thông quan vào cùng một không gian vector nhiều chiều, từ đó tính xác suất và trả về danh sách các mã HS có độ tương đồng ngữ cảnh cao nhất kèm thống kê xuất xứ/nhập khẩu lịch sử.
- **Cách đo & Kết quả:** Đo độ chính xác dự đoán (Top-k / Top-1 accuracy) trên dữ liệu tờ khai thông quan lịch sử của từng nước thành viên. Do mô hình học trực tiếp từ phân phối tờ khai nội bộ, kết quả dao động rất mạnh theo độ lặp lại của mặt hàng: bản thử nghiệm thích nghi tại Hải quan Azerbaijan được báo cáo đạt khoảng **85%** ở cấp 6 số và **82%** ở cấp 10 số trên tập giao dịch lịch sử nội địa có tần suất cao; tuy nhiên, khi đánh giá độc lập bản mẫu `WCO BACUDA` trên bộ 103 phán quyết phân loại chuẩn của Hải quan Mỹ (CBP CROSS) ngoài tập huấn luyện (Judy, 2024 [`arXiv:2412.14179`]), độ chính xác khớp đúng trọn mã 10 số chỉ đạt **12,75% (13/103 ca)**.
- **Kiểu lỗi & Giới hạn:**
  1. *Học vẹt thói quen khai báo thay vì học luật:* Mô hình không đọc quy tắc GIR hay chú giải loại trừ; nếu dữ liệu tờ khai lịch sử có lỗi khai sai hệ thống, mô hình sẽ học và nhân rộng chính lỗi đó.
  2. *Sụp đổ ngoài phân phối (out-of-distribution) và ở đuôi dài (long-tail):* Khi gặp mặt hàng công nghiệp mới, mô tả khác cách viết quen thuộc hoặc khi biểu thuế HS cập nhật định kỳ 5 năm/lần, vector lịch sử mất hiệu lực.

#### (b) Hải quan Hàn Quốc (Korea Customs Service — KCS) & KAIST/GIST: Mô hình phân cấp có giải thích
- **Nguồn & Đường dẫn:**
  - Lee, E. et al. (2021), *"Classification of Goods Using Text Descriptions With Sentences Retrieval"*, [`https://arxiv.org/abs/2111.01663`](https://arxiv.org/abs/2111.01663).
  - Lee, E. et al. (2023/2024), *"Explainable Product Classification for Customs"*, *ACM Transactions on Intelligent Systems and Technology (ACM TIST)*, [`https://arxiv.org/abs/2311.10922`](https://arxiv.org/abs/2311.10922).
- **Phương pháp:** Huấn luyện bộ mã hoá Transformer chuyên biệt tiếng Hàn (**`KoELECTRA`**) theo cấu trúc phân cấp để gợi ý nhóm (4 số) và phân nhóm (6 số), kết hợp mô-đun truy hồi câu giải thích (*Alignment Information Retrieval — AIR*) trích các câu có độ tương đồng cao từ cẩm nang phân loại để hiển thị kèm gợi ý cho công chức hải quan.
- **Cách đo & Kết quả:**
  - Nghiên cứu năm 2021 đo trên **129.084 hồ sơ phân loại lịch sử** (tập trung vào Chương 85, gồm **265 phân nhóm 6 số**), đạt độ chính xác gợi ý **Top-3 là 95,5%** ở cấp 6 số.
  - Nghiên cứu mở rộng năm 2023 đo trên **5.000 hồ sơ yêu cầu phân loại khó** của KCS trải trên **925 phân nhóm 6 số**, đạt độ chính xác gợi ý **Top-3 là 93,9%**, kèm thử nghiệm người dùng trên 32 chuyên viên hải quan giúp rút ngắn thời gian tra cứu.
  - Độ chính xác Top-1 ở cấp dòng thuế cuối (8–10 số) trên toàn bộ 97 chương của biểu thuế: **chưa tìm thấy** trong hai công bố trên (nhóm tác giả giới hạn bài toán ở công cụ gợi ý Top-3 cấp 6 số).
- **Kiểu lỗi & Giới hạn:**
  1. *Nhầm lẫn ở vùng biên đa chức năng:* Các mặt hàng lai hoặc bộ phận dùng chung giữa hai nhóm/phân nhóm liền kề có phân phối xác suất phẳng, dễ lọt khỏi Top-1.
  2. *Trôi nhãn theo phiên bản biểu thuế:* Phụ thuộc vào hàng trăm nghìn hồ sơ tiền lệ cũ; khi chú giải hoặc cấu trúc phân nhóm thay đổi, mô hình phải gán nhãn và huấn luyện lại.
  3. *Giải thích dựa trên tương đồng bề mặt:* Các câu trích ra để "giải thích" được chọn theo điểm tương đồng văn bản với mô tả hàng chứ không phải một chuỗi suy luận đóng kín chứng minh vì sao nhận mã này và loại các mã anh em.

#### (c) Hải quan Estonia & Trung Quốc: Các mô hình học máy và mạng nơ-ron lai trên mô tả tờ khai
- **Nguồn & Đường dẫn:**
  - Spichakova, M. & Haav, H.-M. (2020), *"Application of Machine Learning for Assessment of HS Code Correctness"*, *Baltic Journal of Modern Computing*, Vol. 8, No. 2 (`https://doi.org/10.22364/bjmc.2020.8.2.07`).
  - Các nghiên cứu áp dụng mạng lai **`ERNIE-BiLSTM-Channel Attention`** và **`fastText` / `SBERT`** trên mô tả hải quan bán cấu trúc (công bố trên *MDPI Applied Sciences* / *Electronics* và hệ thống tổng thuật tại *Semantic Scholar*).
- **Phương pháp & Kết quả:** Spichakova & Haav kết hợp độ tương đồng văn bản `Doc2Vec` với độ đo khoảng cách phân cấp trên cây taxonomy HS để đánh giá tính hợp lệ của mã HS 6 số trên tập dữ liệu vận đơn *Bill of Lading Summary 2017* (đạt tỷ lệ trúng gợi ý tới ~80% trên các tập con thử nghiệm). Hướng `ERNIE-BiLSTM` dùng cơ chế chú ý đa kênh để bắt thuật ngữ chuyên ngành tiếng Trung trong các câu khai báo ngắn.
- **Kiểu lỗi & Giới hạn:** Đều là các mô hình khớp mẫu thống kê (*statistical pattern matching*) ở cấp 4–6 số trên tập danh mục hẹp; không có khả năng xử lý điều kiện số học, mệnh đề phủ định *"trừ..."*, hay định nghĩa phần bù của dòng *"Loại khác"*.

#### (d) Các cuộc thi công khai (Public Competitions / Shared Tasks)
- **Tình trạng tra cứu:** **Chưa tìm thấy** bất kỳ cuộc thi mở quy mô quốc tế nào (trên nền tảng Kaggle, CodaLab, WCO hay tại các hội nghị AI/NLP lớn) công bố bộ dữ liệu chuẩn hoá kèm đáp án pháp lý ở cấp 8–10 số cho bài toán phân loại mã HS.
- **Nguyên nhân:** Dữ liệu tờ khai hải quan của các quốc gia bị ràng buộc bởi luật bí mật thương mại và bảo mật thuế; các đợt thi khoa học dữ liệu từng được ghi nhận (như tại Hải quan Indonesia hoặc Hải quan Dubai) đều là thử thách nội bộ đóng kín. Sự thiếu vắng một sân chơi chuẩn hoá mở mới chỉ bắt đầu được khắc phục từ cuối năm 2024–2026 nhờ sự ra đời của các bộ benchmark học thuật công khai (`ATLAS`, `HSCodeComp`, `HSBench`) trình bày ở mục 2.2–2.4.

---

### 2.2. Tinh chỉnh mô hình ngôn ngữ lớn (Fine-tuned LLMs) trên phán quyết hải quan và đánh giá công cụ thương mại

#### (a) ATLAS — Bộ chuẩn 18.731 phán quyết CROSS của Hải quan Mỹ và mô hình LLaMA-3.3-70B tinh chỉnh
- **Nguồn & Đường dẫn:**
  - Yuvraj, P. & Devarakonda, S. (09/2025), *"ATLAS: Benchmarking and Adapting Large Language Models for Global Trade via Harmonized Tariff Code Classification"*, [`https://arxiv.org/abs/2509.18400`](https://arxiv.org/abs/2509.18400).
  - Model & Dataset: [`https://huggingface.co/flexifyai/atlas-llama3.3-70b-hts-classification`](https://huggingface.co/flexifyai/atlas-llama3.3-70b-hts-classification), [`https://huggingface.co/datasets/flexifyai/cross_rulings_hts_dataset_for_tariffs`](https://huggingface.co/datasets/flexifyai/cross_rulings_hts_dataset_for_tariffs).
- **Phương pháp:** Thu thập và làm sạch **18.731 phán quyết phân loại có hiệu lực pháp lý** từ hệ thống *U.S. Customs Rulings Online Search System (CROSS)* của Hải quan Mỹ, chuyển đổi thành các cặp lời nhắc – suy luận có cấu trúc và tinh chỉnh có giám sát (*supervised fine-tuning*) mô hình mã nguồn mở **`LLaMA-3.3-70B`**.
- **Cách đo & Kết quả:** Đo độ chính xác khớp tuyệt đối (*Exact-Match Accuracy*) ở từng tầng phân cấp (2 số, 4 số, 6 số và trọn mã 10 số HTS Mỹ) trên tập kiểm tra giữ riêng:
  - **`ATLAS (Fine-tuned LLaMA-3.3-70B)`:** Đạt **57,5%** ở cấp 6 số và **40,0%** ở cấp trọn mã 10 số.
  - **`GPT-5-Thinking` (Zero-shot):** Đạt **55,5%** ở cấp 6 số và **25,0%** ở cấp trọn mã 10 số.
  - Các biến thể `Gemini-2.5-Pro` chạy zero-shot cũng thấp hơn `ATLAS` từ 15 đến 27 điểm phần trăm ở cấp khớp trọn mã.
- **Kiểu lỗi & Giới hạn:**
  1. *Vách đá độ chi tiết (The Granularity Cliff):* Dù được tinh chỉnh trên gần 19.000 phán quyết thật, độ chính xác vẫn rơi xuống **40,0%** ở cấp mã cuối (cứ 10 lần phân loại thì **6 lần sai**).
  2. *Học luật ngầm vào trọng số (Parametric memorization):* Khi nhồi quy tắc phân loại vào trọng số mạng qua fine-tuning, mô hình không tách bạch được *"văn bản luật hiện hành"* với *"ký ức huấn luyện"*, dẫn tới hiện tượng đoán mò khi mô tả thiếu thông số vật liệu/quy trình, dễ sai ở các nhóm ít xuất hiện trong tập CROSS và không đảm bảo tính giải trình nguyên văn từng điều kiện.

#### (b) Đánh giá độc lập các công cụ phân loại HTS thương mại (Bryce Judy, 2024)
- **Nguồn & Đường dẫn:**
  - Judy, B. (12/2024), *"Benchmarking Harmonized Tariff Schedule Classification Models"*, [`https://arxiv.org/abs/2412.14179`](https://arxiv.org/abs/2412.14179).
- **Phương pháp & Cách đo:** Kiểm thử 4 công cụ phân loại mã HTS (3 nền tảng thương mại và 1 bản mẫu của WCO) trên bộ mẫu ngẫu nhiên **103 mặt hàng** trích từ phán quyết chính thức của Hải quan Mỹ (CBP), chấm tỷ lệ khớp đúng trọn mã 10 số.
- **Kết quả:** `Tarifflo` đạt **89,22%** (91/103), `Avalara` (quy trình có hỗ trợ AI, tốc độ xử lý chậm hơn) đạt **80,00%** (82/103), `Zonos` đạt **44,12%** (45/103), và bản mẫu `WCO BACUDA` đạt **12,75%** (13/103).
- **Giới hạn:** Tập mẫu rất nhỏ (103 ca); các hệ thống thương mại đạt điểm cao là dịch vụ hộp đen đóng kín (*proprietary black-box*), không công bố kiến trúc thuật toán, không rõ tỷ lệ can thiệp của dữ liệu tra cứu sẵn và không kiểm định khả năng dừng hỏi khi mô tả thiếu dữ kiện.

---

### 2.3. Bộ chuẩn Agent tìm kiếm sâu và quy trình điều phối nhiều chặng (Agentic Workflows)

#### (a) HSCodeComp — Bộ chuẩn đánh giá 23 LLM/VLM và Deep Search Agents (Alibaba, ACL 2026)
- **Nguồn & Đường dẫn:**
  - Yang, Y., Lan, T., Jia, Q., Zhu, L., Jiang, H., Zhu, H., Wang, L., Luo, W., & Zhang, K. — Alibaba International Digital Commerce (10/2025, công bố tại **ACL 2026**), *"HSCodeComp: A Realistic and Expert-level Benchmark for Deep Search Agents in Hierarchical Rule Application"*, [`https://arxiv.org/abs/2510.19631`](https://arxiv.org/abs/2510.19631), [`https://aclanthology.org/2026.acl-long.937/`](https://aclanthology.org/2026.acl-long.937/).
- **Phương pháp & Cách đo:** Xây dựng bộ chuẩn **632 mặt hàng thương mại điện tử thực tế** (đa phương thức: tiêu đề, thuộc tính văn bản + hình ảnh sản phẩm) được chuyên gia hải quan gán nhãn mã HS 10 số. Bài báo đánh giá 14 mô hình nền tảng không dùng công cụ (các biến thể `GPT-5`, `Gemini 2.5 Pro`, `Claude Sonnet 4`, họ `DeepSeek`) cùng các khung Agent tìm kiếm sâu mã nguồn mở và thương mại (*SmolAgents*, *AWorld*, *Gemini Deep Researcher*, *Manus*) qua các cấp 2, 4, 6, 8 và 10 chữ số.
- **Kết quả định lượng:**
  - **Mô hình nền tảng không công cụ (Zero-shot LLM):** `GPT-5` đạt **~29%**, `Gemini 2.5 Pro` đạt **23,0%** ở cấp trọn mã 10 số.
  - **Agent tìm kiếm sâu có công cụ tra cứu luật & web:** Cấu hình tốt nhất toàn bài báo (`SmolAgents` dùng backbone `GPT-5` kết hợp đầu vào hình ảnh VLM) đạt **46,83% (~46,8%)** ở cấp 10 số.
  - **Chuyên gia con người:** Đạt **95,0%** trên cùng bộ dữ liệu — cao gấp đôi Agent AI mạnh nhất.
  - **Thử nghiệm can thiệp kỹ thuật nhắc lệnh:** Việc thêm bước tự phản tư (*self-reflection*), tự bỏ phiếu nhiều lượt (*majority voting*), hoặc chèn thêm "luật quyết định" tổng quát vào prompt cho agent tự do **không** giúp vượt trần (điểm số chỉ dao động từ **−3,0 đến +1,7 điểm phần trăm**).
- **Kiểu lỗi (Phân tích lỗi hệ thống của bài báo):**
  1. *Chốt non (Premature commitment):* Agent dừng tìm kiếm ngay khi thấy một dòng biểu thuế có từ khoá khớp bề mặt mà không đọc tiếp các điều kiện loại trừ hoặc các mã anh em.
  2. *Xử lý sai hoặc bỏ sót thuộc tính sản phẩm:* Đọc sai thông số trên trang hàng hoặc bỏ qua thành phần vật liệu quyết định.
  3. *Áp sai thứ tự quy tắc (Rule misapplication):* Nhảy cóc quy tắc GIR hoặc áp sai điều khoản loại trừ của Chú giải Chương.
  4. *Thiếu tri thức miền ngành (Domain knowledge deficit):* Không hiểu bản chất kỹ thuật của hàng hoá để ánh xạ sang thuật ngữ pháp lý của biểu thuế.
  5. *Bịa lập luận pháp lý (Hallucinated reasoning):* Khi không tìm được căn cứ khớp, LLM tự chế ra lập luận nghe hợp lý để hợp thức hoá mã đã chọn.

#### (b) Quy trình Agent tất định 6 chặng (ĐH Giao thông Thượng Hải & Tổng cục Hải quan Trung Quốc, 2026)
- **Nguồn & Đường dẫn:**
  - Zhang, Y., Zhuang, D., Zhou, Q., Huang, Z., Wu, J., Cao, J., & Chen, K. — Shanghai Jiao Tong University & General Administration of Customs of China (05/2026), *"A Deterministic Agentic Workflow for HS Tariff Classification: Multi-Dimensional Rule Reasoning with Interpretable Decisions"*, [`https://arxiv.org/abs/2605.14857`](https://arxiv.org/abs/2605.14857).
- **Phương pháp:** Bác bỏ cách để LLM tự lập kế hoạch mở (*unconstrained self-planning*) vì LLM thường tối ưu một chiều (ví dụ khớp tên vật liệu) mà vi phạm quy tắc ưu tiên ở chiều khác (ví dụ hình thái hoặc chức năng). Nhóm tác giả thiết kế kiến trúc 2 tầng:
  - *Tầng kỹ nghệ tri thức ngoại tuyến (Offline tier):* Bóc tách Chú giải Phần/Chương thành các mệnh đề có cấu trúc (*bao gồm / loại trừ / ưu tiên*) và lập chỉ mục kép gồm **`BM25`** (bắt danh từ kỹ thuật hiếm như *"polyurethane"*, *"centrifugal"*) và **Dense Embedding** (bắt diễn giải công dụng).
  - *Tầng suy luận trực tuyến 6 chặng cố định (Online 6-stage pipeline):* (1) Trích xuất thuộc tính (vật liệu, hình thái, chức năng) → (2) Truy hồi ~40 nhóm ứng viên bằng `BM25 + Dense` gộp qua *Reciprocal Rank Fusion (RRF)* → (3) Lọc ngắn L1 xuống ~10 nhóm 4 số → (4) Xếp hạng L2 và kiểm tra chú giải loại trừ để lấy Top-3 nhóm → (5) Phân giải phân nhóm 6 số → (6) Chấm điểm cuối và trích dẫn nguyên văn GIR/chú giải.
- **Cách đo & Kết quả:** Đo trên cùng bộ **632 mặt hàng của `HSCodeComp`**, dừng ở cấp **4 số và 6 số quốc tế** (số đo cấp 8–10 số quốc gia: **chưa tìm thấy** trong công bố vì nhóm tác giả giới hạn ở chuẩn 6 số WCO):
  - Với mô hình frontier **`Qwen3.6-plus`:** Đạt **75,0% Top-1** / **91,5% Top-3** ở cấp 4 số; và **64,2% Top-1** / **78,3% Top-3** ở cấp 6 số.
  - Với mô hình mở **`Qwen3.6-27B-FP8`:** Đạt độ đồng thuận Top-1 bằng 84,2% (ở 4 số) và 77,4% (ở 6 số) so với mô hình frontier.
  - Khi kiểm toán thủ công **226 ca bất đồng ở cấp 6 số**, nhóm tác giả phát hiện một phần đáng kể lỗi thuộc về **nhãn gốc (ground-truth) của bộ dữ liệu bị gán sai quy tắc HS**.
- **Kiểu lỗi (5 mẫu lỗi thật của hệ thống sau khi đã loại lỗi nhãn dữ liệu):**
  1. *Nhầm lẫn từ vựng/vật liệu tinh vi trong cùng chương:* Ví dụ phân biệt đá cubic zirconia, đá tổng hợp và đá tái tạo ở Chương 71.
  2. *Mơ hồ ranh giới giữa thân/vỏ và bộ phận:* Ví dụ phân biệt thân vỏ đồng hồ (`9111.x`) với bộ phận đồng hồ chung (`9114.x`) ở Chương 91.
  3. *Đặt sai trọng số ưu tiên hình thái so với vật liệu ở bước lọc sớm:* Ví dụ tại Chương 39, các phân nhóm gọi tên theo vật liệu (như nhựa PLA) đè lên phân nhóm gọi tên theo hình thái (sợi đơn monofilament có kích thước mặt cắt > 1 mm).
  4. *Định tuyến sai bộ phận máy:* Đẩy bộ phận chi tiết máy về các chương/nhóm bộ phận chung thay vì nhóm máy chức năng theo đúng Chú giải 2 Phần XVI và Phần XVII.
  5. *Xử lý không nhất quán xung đột GIR 3(a):* Lúng túng khi áp dụng quy tắc "nhóm đặc trưng hơn thắng nhóm khái quát" khi tập ứng viên có các nhóm vét cạn ("Loại khác").

#### (c) Khung Agent đồng thuận cho biểu thuế 10 số Canada (2026)
- **Nguồn & Đường dẫn:**
  - *"Consensus-based Agentic Large Language Model Framework for Harmonized Tariff Schedule Code Classification"* (06/2026), [`https://arxiv.org/abs/2606.16987`](https://arxiv.org/abs/2606.16987) (đối chiếu cùng báo cáo tổng hợp nội bộ `OZV-243`).
- **Phương pháp & Cách đo:** Kết hợp truy hồi tài liệu ngữ nghĩa (RAG), nhiều tác nhân kiểm định độc lập và cơ chế bỏ phiếu đa số theo từng thành phần mã (*element-wise majority voting* từ chương xuống hậu tố thống kê), đo trên tập dữ liệu thực tế riêng gồm **3.300 bản ghi hàng hoá** trong chuỗi cung ứng được chuyên gia gán nhãn theo biểu thuế **10 số của Canada**.
- **Kết quả & Kiểu lỗi:**
  - Trên cùng một khung điều phối, mô hình mạnh (**`Gemini-3.1-Pro`**) đạt khoảng **~41%** khớp đúng trọn mã 10 số, trong khi hai mô hình yếu hơn chỉ đạt **~15%** và **~7%** (số liệu tổng hợp từ bản tóm tắt; bảng phân rã chi tiết từng tầng **chưa tìm thấy** trong bản trích lục công khai).
  - *Kết luận quan trọng của bài báo:* (1) Năng lực suy luận của mô hình nền là yếu tố quyết định bậc một; (2) Với các mô tả hàng hoá ngắn hoặc thiếu dữ kiện thực tế, mọi phương pháp đoán thẳng một bước (*single-step prediction*) đều thất bại ở các chữ số cuối — hệ thống bắt buộc phải đo độ bất định qua mức độ bất đồng giữa các nhánh để chuyển hồ sơ cho con người xử lý (*Human-in-the-Loop escalation*).

---

### 2.4. Đồ thị tri thức dẫn đường cho LLM (Knowledge-Graph-Guided LLMs)

#### HSGraphAgent & Bộ chuẩn HSBench (ACL 2026)
- **Nguồn & Đường dẫn:**
  - Xia, Q., Zhang, Z., Wang, A., Wang, W., Wang, X., & Li, J. (**ACL 2026**), *"HSGraphAgent: Knowledge-Graph-Guided Large Language Models for Harmonized System Code Classification"*, [`https://aclanthology.org/2026.acl-long.2072/`](https://aclanthology.org/2026.acl-long.2072/) ([PDF](https://aclanthology.org/2026.acl-long.2072.pdf)).
  - Mã nguồn & Benchmark `HSBench`: [`https://github.com/VoldeMordddddd/HSBench`](https://github.com/VoldeMordddddd/HSBench).
- **Phương pháp:** Nhóm tác giả chỉ ra rằng RAG thông thường bị bão hoà ở cấp phân nhóm 6 số vì truy hồi tương đồng cục bộ không nhìn thấy các ràng buộc cấu trúc toàn cục và quy tắc loại trừ. `HSGraphAgent` dựng một đồ thị tri thức miền HS (gồm các nút phân cấp và các cạnh quy tắc loại trừ) cùng cơ chế suy luận **Select–Redirect (Chọn – Chuyển hướng)** lúc chạy: khi LLM đi vào một nhánh trên đồ thị mà đụng cạnh loại trừ khớp với thuộc tính mặt hàng, thuật toán cưỡng bức chuyển hướng LLM sang nhánh đích hợp lệ theo luật.
- **Cách đo & Kết quả:** Đo Top-1 accuracy ở cấp 4 số và 6 số trên bộ chuẩn đa ngôn ngữ `HSBench` (trên các mô hình `DeepSeek-V3.2-685B`, `Kimi-K2-1T`, `GPT-OSS-120B`, `Qwen2.5-32B`). Với backbone **`DeepSeek-V3.2-685B`**, `HSGraphAgent` nâng độ chính xác Top-1 ở cấp 6 số thêm **+18,0 điểm phần trăm tuyệt đối**, đạt **90,2% (0,902)** so với **72,2% (0,722)** của phương pháp cơ sở (RAG/sinh thẳng). Số đo ở cấp 8–10 số quốc gia: **chưa tìm thấy** (bộ `HSBench` chỉ đánh giá tới cấp 6 số WCO).
- **Kiểu lỗi & Giới hạn:**
  1. *Chỉ dừng ở cấp 6 số quốc tế:* Chưa giải quyết tầng phân tách từ 6 số xuống 8/10 số quốc gia (nơi tập trung dày đặc các ngưỡng số học, chú giải phân nhóm SEN và các dòng *"Loại khác"*).
  2. *Giả định mô tả đầu vào đã đủ dữ kiện:* Cơ chế `Select–Redirect` mặc định trong mô tả mặt hàng đã có sẵn thông tin để quyết định cạnh loại trừ đúng hay sai; chưa giải quyết bài toán **phát hiện dữ kiện ẩn còn thiếu** để dừng lại đặt câu hỏi cho người khai.

---

### 2.5. Bảng tổng hợp các công bố tiêu biểu

| Công trình / Nguồn | Phương pháp cốt lõi | Bộ dữ liệu & Cấp mã đo | Kết quả định lượng (có nguồn) | Điểm nghẽn / Kiểu lỗi chính |
|---|---|---|---|---|
| **WCO BACUDA (AI-HS)** (`wcoomd.org`) & **Judy (2024)** ([`arXiv:2412.14179`](https://arxiv.org/abs/2412.14179)) | Vector hoá mô tả tờ khai lịch sử (`Doc2Vec` + mạng nơ-ron), gợi ý theo xác suất | Tờ khai nội địa các nước; kiểm định độc lập trên 103 phán quyết CBP Mỹ (10 số) | Nội địa (Azerbaijan): ~85% (6 số), ~82% (10 số). Độc lập trên CBP CROSS (10 số): **12,75%** (13/103) | Học theo thói quen tờ khai cũ (kể cả lỗi sai); không đọc chú giải loại trừ; gãy khi gặp hàng ngoài phân phối |
| **Korea Customs Service — Lee et al. (2021, 2023)** ([`arXiv:2111.01663`](https://arxiv.org/abs/2111.01663), [`arXiv:2311.10922`](https://arxiv.org/abs/2311.10922)) | Transformer phân cấp (`KoELECTRA`) + truy hồi câu giải thích từ tài liệu hướng dẫn | 129.084 ca lịch sử (265 mã 6 số) & 5.000 ca yêu cầu khó (925 mã 6 số) | **95,5% Top-3** (265 mã 6 số, 2021); **93,9% Top-3** (925 mã 6 số, 2023). Top-1 mã 8/10 số: *chưa tìm thấy* | Chỉ hỗ trợ gợi ý Top-3 ở cấp 6 số; nhầm ở hàng đa chức năng giáp ranh; phụ thuộc tiền lệ cũ khi luật sửa đổi |
| **ATLAS — Yuvraj & Devarakonda (2025)** ([`arXiv:2509.18400`](https://arxiv.org/abs/2509.18400)) | Tinh chỉnh (`SFT`) mô hình `LLaMA-3.3-70B` trên các phán quyết có lập luận | 18.731 phán quyết Hải quan Mỹ (US CROSS), đo khớp tuyệt đối 6 số và 10 số | `ATLAS-70B`: **57,5%** (6 số), **40,0%** (10 số). `GPT-5-Thinking` zero-shot: **55,5%** (6 số), **25,0%** (10 số) | Suy giảm mạnh từ 6 số xuống 10 số (*granularity cliff*); nhồi luật vào trọng số nên vẫn đoán mò khi thiếu dữ kiện |
| **HSCodeComp — Yang et al., Alibaba (ACL 2026)** ([`arXiv:2510.19631`](https://arxiv.org/abs/2510.19631)) | Đánh giá 14 LLM/VLM và các khung Deep Search Agents có công cụ tìm web & tra luật | 632 mặt hàng TMĐT đa phương thức (chữ + ảnh), gán nhãn chuyên gia 10 số | Zero-shot: `GPT-5` **~29%**, `Gemini 2.5 Pro` **23%**. Agent tốt nhất (`SmolAgents`+`GPT-5`): **46,83%**. Người: **95,0%** | Chốt non; bỏ sót thông số; áp sai GIR/loại trừ; bịa lập luận. Tự phản tư / bỏ phiếu chỉ đổi −3,0 đến +1,7 điểm |
| **Deterministic 6-Stage Workflow — Zhang et al. (2026)** ([`arXiv:2605.14857`](https://arxiv.org/abs/2605.14857)) | Ngoại tuyến tách chú giải gồm/loại trừ/ưu tiên + `BM25` & Dense; trực tuyến 6 chặng cố định | 632 mặt hàng của `HSCodeComp`, đo ở cấp 4 số và 6 số quốc tế | `Qwen3.6-plus`: 4 số **75,0% Top-1** (91,5% Top-3); 6 số **64,2% Top-1** (78,3% Top-3). Cấp 8/10 số: *chưa tìm thấy* | 5 lỗi: nhầm vật liệu tinh vi (Ch.71); vỏ vs bộ phận (Ch.91); vật liệu đè hình thái (Ch.39); sai Chú giải 2 Phần XVI; sai GIR 3(a) |
| **Consensus Agent Framework (2026)** ([`arXiv:2606.16987`](https://arxiv.org/abs/2606.16987)) | Đa tác nhân + RAG + bỏ phiếu đồng thuận theo từng tầng mã để đẩy ca khó cho người | 3.300 mặt hàng thực tế có nhãn chuyên gia theo biểu thuế 10 số Canada | Trọn mã 10 số: `Gemini-3.1-Pro` **~41%**, hai mô hình yếu hơn **~15%** và **~7%** | Sức mô hình là nút thắt bậc một; mô tả hàng ngắn không thể tự chốt 10 số mà phải đẩy sang con người (HITL) |
| **HSGraphAgent — Xia et al. (ACL 2026)** ([`2026.acl-long.2072`](https://aclanthology.org/2026.acl-long.2072/)) | Đồ thị tri thức HS + cơ chế `Select–Redirect` cưỡng bức rẽ nhánh theo cạnh loại trừ | Bộ chuẩn đa ngôn ngữ `HSBench` ở cấp 4 số và 6 số | Với `DeepSeek-V3.2-685B`: cấp 6 số đạt **90,2%** (+18,0 điểm so với baseline **72,2%**). Cấp 8/10 số: *chưa tìm thấy* | Chỉ dừng ở 6 số; giả định mô tả đầu vào đã có đủ dữ kiện, chưa biết phát hiện dữ kiện ẩn còn thiếu để dừng hỏi |

---

## 3. So sánh với phương pháp của OZ Việt Nam (`hs-code-api`): Khác biệt cốt lõi và Những việc chưa ai làm

### 3.1. Khác biệt về triết lý gốc: Số hoá luật thành dữ liệu cho LLM đọc, tuyệt đối không để máy đoán mã

Toàn bộ các công trình hiện có trên thế giới đều đi theo một trong hai hướng:
1. **Hướng học máy thống kê / Tinh chỉnh trọng số** (`WCO BACUDA`, `KoELECTRA`, `ATLAS`): Coi mã HS là một nhãn phân lớp và dùng dữ liệu lịch sử để dạy máy *đoán mã có xác suất cao nhất*.
2. **Hướng RAG / Agent tìm kiếm lúc chạy** (`HSCodeComp`, `Zhang et al. 2026`, `Consensus Agent`, `HSGraphAgent`): Mỗi khi có một mô tả hàng của khách, hệ thống dùng tìm kiếm từ khoá/vector để cắt vài đoạn văn bản luật đưa vào ngữ cảnh rồi yêu cầu LLM vừa tự hiểu luật vừa phân loại ngay trong lượt gọi đó.

Phương pháp của OZ Việt Nam (được định hình qua chuỗi quyết định kiến trúc từ [`ADR-0002`](../decisions/0002-do-thi-tri-thuc-tim-chon-nhom-di-canh-xuong-ma.md), [`ADR-0004`](../decisions/0004-quy-trinh-phan-loai-chuan-6-quy-tac.md), [`ADR-0005`](../decisions/0005-repo-la-ban-do-luat-llm-la-nguoi-doc.md) đến [`ADR-0007`](../decisions/0007-dieu-kien-nguyen-tu-bang-anh-em.md), [`ADR-0010`](../decisions/0010-m81-cham-dung-sai-va-nhom-canh-tranh.md) và [`ADR-0011`](../decisions/0011-doc-mot-lan-tu-chuong-xuong-8-so.md)) tách bài toán theo một ranh giới hoàn toàn khác:

> **Kho dữ liệu (`hs-code-api`) là bản đồ luật và trình tự bắt buộc phải đọc; LLM là người đọc luật, đối chiếu và phán đoán. Máy tuyệt đối không dùng từ khoá, vector hay xác suất để đoán mã thay LLM.**

Thay vì bắt mô hình đọc văn bản luật thô từ đầu ở mỗi lượt khách hỏi (vừa chậm, tốn chi phí, vừa không ổn định), và thay vì dùng mô hình nhỏ/rẻ soạn dữ liệu rồi dựa vào hàng chục cổng kiểm tra hình thức (vốn chỉ bắt được lỗi cú pháp chứ không bắt được lỗi hiểu sai nghĩa luật — thực nghiệm vòng 2b thẻ M-81 của OZ cho thấy mô hình rẻ qua đủ cổng hình thức vẫn sai **12/191 ca**, tức cứ ~16 lần dùng có 1 lần trả mã sai), [`ADR-0011`](../decisions/0011-doc-mot-lan-tu-chuong-xuong-8-so.md) xác lập quy trình **biên dịch toàn bộ hệ thống luật thành cơ sở dữ liệu chuẩn hoá một lần từ Chương xuống dòng 8 số bằng cặp mô hình mạnh (Người đọc – Người phản biện)**.

---

### 3.2. Sáu điểm khác biệt và phần việc chưa có công bố nào trên thế giới thực hiện

| Trục so sánh | Các nghiên cứu & hệ thống trên thế giới | Phương pháp của OZ Việt Nam (`ADR-0004` → `ADR-0011`) | Điểm mới chưa ai làm |
|---|---|---|---|
| **1. Cách đọc và biên dịch luật theo chiều sâu phân cấp** | Cắt vụn chú giải theo đoạn văn để truy hồi RAG lúc chạy, hoặc chỉ xét riêng lẻ từng nhóm/phân nhóm tới 6 số | **Đọc trọn một lần từ trên xuống dưới (`ADR-0011`):** Bậc 2 (Chương) → Bậc 4 (Nhóm) → Bậc 6 (Phân nhóm) → Bậc 8 (Dòng thuế VN). Mỗi bậc lấy bản ghi đã chốt của bậc cha ngay trên làm bối cảnh bắt buộc | Lần đầu tiên hệ thống hoá toàn bộ một chương từ chú giải phần/chương, trục chia nhóm, nhóm cạnh tranh xuống tận điều kiện nguyên tử của từng dòng 8 số trong một luồng ngữ cảnh xuyên suốt của mô hình mạnh |
| **2. Xử lý chỗ mơ hồ trong câu chữ pháp lý (`DIEM_MO_HO`)** | Để một LLM tự quyết hoặc dùng bỏ phiếu đa số (*majority voting*) giữa các lượt chạy cùng kiểu lúc khách hỏi (`arXiv:2510.19631`, `arXiv:2606.16987`) | **Phản biện chéo một vòng giữa hai mô hình mạnh khác họ ở pha xây dựng cơ sở dữ liệu luật (`ADR-0011` mục 1–2):** Người đọc (vd Gemini Pro) nêu `DIEM_MO_HO`; Người phản biện (vd Claude) viết *giải thích → chứng minh (chỉ bằng câu luật nguyên văn, EN và GIR) → phản biện (lập luận mạnh nhất cho cách hiểu đối lập) → kết luận* | Biên dịch sẵn các tranh chấp cách hiểu luật thành bản ghi `DIEM_MO_HO` có cấu trúc trước khi phục vụ khách; nếu hai cách hiểu phụ thuộc dữ kiện thực tế của hàng thì đóng thành trạng thái `CHƯA ĐỦ DỮ KIỆN` kèm câu hỏi khách (`cauHoiKhach`) |
| **3. Định nghĩa và đóng kín dòng *"Loại khác"* (3.357 dòng 8 số)** | Coi *"Loại khác"* là một nhãn văn bản thường hoặc cố gán bằng danh sách sản phẩm ví dụ / từ đồng nghĩa | **Đóng bằng công thức phần bù trên điều kiện nguyên tử (`ADR-0007`, `ADR-0009`):** $\text{Loại khác}(P) = \text{Phạm vi}(P) \land \neg(\bigcup \text{Anh em có tên cùng cấp})$. Tách trục đơn trị/đa trị (`daTri`), miền đóng `tapDu` có trích dẫn nguyên văn và bản ghi giải chồng (`GIAI_CHONG`) | Chưa có công bố nào hình thức hoá điều kiện đủ của dòng *"Loại khác"* ở cấp 8 số bằng đại số Boole (HOẶC-của-VÀ) trên các điều kiện nguyên tử có trích dẫn câu luật nguyên văn và kiểm chứng tính rời nhau / phủ kín giữa các anh em |
| **4. Ứng xử khi mô tả hàng thiếu dữ kiện & Thước đo nghiệm thu** | Luôn ép mô hình xuất ra một mã dự đoán (đo bằng % Top-1 / Top-3 accuracy); mô hình thường đoán mò xuống mã cuối (*"nói quá mức dữ kiện"*) | **Ba ô kết quả nghiêm ngặt (`ADR-0004`, `ADR-0010`):** Chỉ trả `ĐÚNG` khi có đủ câu luật ở mọi bậc và loại hết anh em cùng cấp; thiếu dữ kiện phân nhánh thì bắt buộc vào ô `CHƯA ĐỦ DỮ KIỆN` và dừng hỏi đúng câu hỏi gắn với điều kiện luật (`canCu` + `nguon`). Chấm theo thước **"dùng N lần thì mấy lần ra đích sai"** (ngưỡng mở rộng: **0 lần ra mã sai** so với bảng vàng) | Biến trạng thái *"dừng hỏi đúng chỗ + đúng câu hỏi của điều kiện luật"* thành một nhãn đích hợp lệ trong cả cơ sở dữ liệu luật lẫn phép đo bậc thang T1 (4 số) / T2 (4→6 số) / T3 (6→8 số), thay vì ép máy đoán 8–10 số một lần từ mô tả cụt |
| **5. Phát hiện nhóm cạnh tranh ẩn ngoài dẫn chiếu số** | Chỉ bắt được cạnh loại trừ khi chú giải ghi rõ số nhóm đích, hoặc phụ thuộc vào truy hồi theo câu mô tả ngắn của khách | **Tự truy vấn ngược bằng chính lời văn của luật (`ADR-0010` mục 2):** Lấy nguyên văn từng dòng biểu và từng câu chú giải chi tiết của nhóm $H$ chạy qua máy tìm tất định `timCgct`; mọi nhóm $X$ được xếp trên $H$ đều bị kéo toàn bộ tài liệu bắt buộc đọc (`phai-doc`) vào gói để Người đọc viết câu phân ranh (`canhTranh`) | Phát hiện tất định các cặp nhóm cạnh tranh ngầm trên toàn biểu thuế (như `84.71` vs `85.23`) ngay từ khâu dựng gói luật mà không cần đợi khách hỏi trúng ca lỗi mới biết |
| **6. Vai trò của Tiền lệ, Tờ khai cũ và Cổng máy** | Dùng tờ khai lịch sử / tiền lệ làm dữ liệu huấn luyện trực tiếp (dễ nhiễm nhãn sai như `Zhang et al. 2026` và `ADR-0004` đã chỉ ra) | **Tách tuyệt đối tiền lệ khỏi căn cứ phân loại (`ADR-0004` mục 1, `ADR-0007`):** Tiền lệ (TB-TCHQ) chỉ dùng để kiểm chứng ở bước cuối, không làm căn cứ chọn mã. **Máy chỉ kiểm phần tất định (`ADR-0011`):** câu trích (`trich`) phải là chuỗi con nguyên văn của câu nguồn (`idCau`) kèm vân tay `sha256` | Giải phóng mô hình mạnh khỏi các cổng heuristic bắt bẻ chữ nghĩa, đồng thời khóa chặt 0% trích dẫn bịa bằng kiểm tra chuỗi con nguyên văn và vân tay câu luật (`vanTayGoi` / `sha256`) |

---

### 3.3. Tóm tắt giá trị đóng góp cho bài nghiên cứu khoa học

Khi đặt cạnh các công trình mới nhất đến năm 2026 (`ATLAS`, `HSCodeComp`, `Zhang et al. 2026`, `Consensus Agent`, `HSGraphAgent`), các nghiên cứu hiện tại đều đã nhận ra giới hạn của LLM tổng quát (chỉ đạt 23%–29% zero-shot và 40%–46,8% khi tinh chỉnh hoặc dùng Agent tìm kiếm ở cấp mã 10 số) và đang dịch chuyển sang hướng kết hợp tri thức cấu trúc với quy trình suy luận có kiểm soát. Tuy nhiên, họ vẫn đang giải bài toán ở **pha chạy trực tuyến trên văn bản luật bán cấu trúc** và chủ yếu dừng ở **cấp 6 số quốc tế** dưới giả định **mô tả hàng đã đủ dữ kiện**.

Cách tiếp cận của OZ Việt Nam trong **M-82 ([`ADR-0011`](../decisions/0011-doc-mot-lan-tu-chuong-xuong-8-so.md))** đóng góp một hướng đi mới có thể kiểm chứng định lượng:
1. **Chuyển gánh nặng suy luận luật từ lúc phục vụ khách sang pha biên dịch cơ sở dữ liệu luật:** Dùng một mô hình mạnh đọc xuyên suốt một lần từ Chương (2 số) → Nhóm (4 số) → Phân nhóm (6 số) → Dòng thuế quốc gia (8 số), có bối cảnh cha truyền xuống con và có gói nhóm cạnh tranh do máy tìm tất định (`timCgct` + `phai-doc`) bơm vào sẵn.
2. **Giải quyết sự mơ hồ pháp lý bằng cơ chế tranh biện có cấu trúc giữa hai mô hình mạnh khác họ:** Mỗi điểm mơ hồ đi đúng một vòng *giải thích – chứng minh nguyên văn – phản biện – kết luận*, kết tinh thành tri thức tái sử dụng được (bản ghi `DIEM_MO_HO`, sổ tay vì sao hay tra sai `docs/so-tay-tra-sai/`, và câu hỏi phải hỏi khách khi dữ kiện thực tế chưa đủ).
3. **Đóng kín toàn bộ phép phân nhánh bằng chứng cứ nguyên văn:** Mọi mã 8 số (kể cả 3.357 dòng *"Loại khác"*) chỉ được phép chốt khi thoả mãn chuỗi điều kiện dương ở mọi bậc trên đường đi và loại trừ được toàn bộ anh em cùng cấp bằng trích dẫn nguyên văn đã qua kiểm chứng vân tay máy.

---

## 4. Danh mục tài liệu tham khảo

### Công bố học thuật & Benchmark quốc tế
1. **Yang, Y., Lan, T., Jia, Q., Zhu, L., Jiang, H., Zhu, H., Wang, L., Luo, W., & Zhang, K.** (2025/2026). *HSCodeComp: A Realistic and Expert-level Benchmark for Deep Search Agents in Hierarchical Rule Application*. Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics (ACL 2026). arXiv:[2510.19631](https://arxiv.org/abs/2510.19631) · ACL Anthology: [`https://aclanthology.org/2026.acl-long.937/`](https://aclanthology.org/2026.acl-long.937/).
2. **Zhang, Y., Zhuang, D., Zhou, Q., Huang, Z., Wu, J., Cao, J., & Chen, K.** (2026). *A Deterministic Agentic Workflow for HS Tariff Classification: Multi-Dimensional Rule Reasoning with Interpretable Decisions*. Shanghai Jiao Tong University & General Administration of Customs of China. arXiv:[2605.14857](https://arxiv.org/abs/2605.14857).
3. **Xia, Q., Zhang, Z., Wang, A., Wang, W., Wang, X., & Li, J.** (2026). *HSGraphAgent: Knowledge-Graph-Guided Large Language Models for Harmonized System Code Classification*. Proceedings of the 64th Annual Meeting of the Association for Computational Linguistics (ACL 2026). ACL Anthology: [`https://aclanthology.org/2026.acl-long.2072/`](https://aclanthology.org/2026.acl-long.2072/) · GitHub Benchmark (`HSBench`): [`https://github.com/VoldeMordddddd/HSBench`](https://github.com/VoldeMordddddd/HSBench).
4. **Yuvraj, P., & Devarakonda, S.** (2025). *ATLAS: Benchmarking and Adapting Large Language Models for Global Trade via Harmonized Tariff Code Classification*. arXiv:[2509.18400](https://arxiv.org/abs/2509.18400) · Hugging Face: [`https://huggingface.co/flexifyai/atlas-llama3.3-70b-hts-classification`](https://huggingface.co/flexifyai/atlas-llama3.3-70b-hts-classification).
5. **Consensus-based Agentic Framework Authors** (2026). *Consensus-based Agentic Large Language Model Framework for Harmonized Tariff Schedule Code Classification*. arXiv:[2606.16987](https://arxiv.org/abs/2606.16987).
6. **Judy, B.** (2024). *Benchmarking Harmonized Tariff Schedule Classification Models*. arXiv:[2412.14179](https://arxiv.org/abs/2412.14179).
7. **Lee, E., et al.** (2023/2024). *Explainable Product Classification for Customs*. ACM Transactions on Intelligent Systems and Technology (TIST) / Korea Customs Service & KAIST. arXiv:[2311.10922](https://arxiv.org/abs/2311.10922).
8. **Lee, E., et al.** (2021). *Classification of Goods Using Text Descriptions With Sentences Retrieval*. Korea Customs Service & KAIST. arXiv:[2111.01663](https://arxiv.org/abs/2111.01663).
9. **Spichakova, M., & Haav, H.-M.** (2020). *Application of Machine Learning for Assessment of HS Code Correctness*. Baltic Journal of Modern Computing, Vol. 8(2), 305–322. DOI: `10.22364/bjmc.2020.8.2.07`.

### Báo cáo của Tổ chức Hải quan Thế giới (WCO) & WTO
10. **World Customs Organization (WCO) & World Trade Organization (WTO)** (2022). *WCO/WTO Study Report on Disruptive Technologies* & *The Role of Advanced Technologies in Cross-Border Trade: A Customs Perspective*. WCO / WTO Publications: [`https://www.wcoomd.org/en/topics/facilitation/instrument-and-tools/tools/study-report-on-disruptive-technologies.aspx`](https://www.wcoomd.org/en/topics/facilitation/instrument-and-tools/tools/study-report-on-disruptive-technologies.aspx).
11. **WCO BACUDA Project (Band of Customs Data Analysts)** (2020–2024). *AI-driven HS Code Recommendation Algorithm (AI-HS)*. World Customs Organization & Korea Customs Service (CCF-Korea): [`https://bacuda.wcoomd.org/`](https://bacuda.wcoomd.org/).

### Tài liệu kiến trúc nội bộ của OZ Việt Nam (`ozvietnam/hs-code-api`)
12. **[`ADR-0002`](../decisions/0002-do-thi-tri-thuc-tim-chon-nhom-di-canh-xuong-ma.md)** (21/11/2026): *Đồ thị tri thức HS — tìm ứng viên đủ nguồn, chọn nhóm có chú giải, đi theo cạnh xuống mã 8 số*.
13. **[`ADR-0004`](../decisions/0004-quy-trinh-phan-loai-chuan-6-quy-tac.md)** (22/11/2026): *Quy trình phân loại chuẩn, đi đúng trình tự 6 Quy tắc và phép đo bậc thang T1/T2/T3*.
14. **[`ADR-0005`](../decisions/0005-repo-la-ban-do-luat-llm-la-nguoi-doc.md)** (25/11/2026): *Repo là bản đồ luật và trình tự đọc; LLM là người đọc và phán đoán*.
15. **[`ADR-0006`](../decisions/0006-ho-so-van-de-ma-8-so.md)** (26/11/2026): *Hồ sơ vấn đề của từng mã 8 số, tách khỏi dữ liệu khách*.
16. **[`ADR-0007`](../decisions/0007-dieu-kien-nguyen-tu-bang-anh-em.md)** (27/11/2026): *Điều kiện nguyên tử và bảng anh em — "Loại khác" đóng bằng tiêu chí*.
17. **[`ADR-0008`](../decisions/0008-trien-khai-m81-theo-nhom-4-so.md) & [`ADR-0009`](../decisions/0009-lam-ro-cong-7-8.md)** (27/11/2026): *Triển khai theo nhóm 4 số; làm rõ cổng 7 PHỦ và cổng 8 CHỒNG — bù theo cấu trúc, trục đa trị, miền đóng `tapDu`*.
18. **[`ADR-0010`](../decisions/0010-m81-cham-dung-sai-va-nhom-canh-tranh.md)** (28/11/2026): *Chấm đúng/sai; gói nhóm kéo nhóm cạnh tranh tìm được bằng máy (`timCgct` + `phai-doc`)*.
19. **[`ADR-0011`](../decisions/0011-doc-mot-lan-tu-chuong-xuong-8-so.md)** (28/11/2026): *Đọc một lần từ chương xuống dòng 8 số; tiêu chuẩn QT cho cơ sở dữ liệu luật (thẻ M-82)*.
