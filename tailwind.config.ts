import type { Config } from "tailwindcss";
const defaultTheme = require("tailwindcss/defaultTheme"); // Thêm dòng này

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Mở rộng bảng màu mặc định với màu tùy chỉnh của bạn
      colors: {
        // Màu Xanh Dương
        primary: "#3A86FF", // Màu chủ đạo
        "primary-dark": "#0B3954", // Xanh Navy đậm (cho footer, text tương phản)
        "primary-light": "#EAF2FF", // Xanh rất nhạt (nền phụ)
        secondary: "#8ECAE6", // Xanh dương phụ trợ (nút phụ, hover)

        // Màu Nhấn (Chọn 1 hoặc cả 2 nếu muốn có lựa chọn)
        accent: "#FFB703", // Vàng (nút CTA, thông báo)
        "accent-alt": "#2A9D8F", // Teal (lựa chọn nhấn thay thế)

        // Màu Trung Tính
        "neutral-darkest": "#212529", // Xám đen (màu chữ chính)
        "neutral-medium": "#6C757D", // Xám vừa (màu chữ phụ)
        "neutral-light": "#CED4DA", // Xám nhạt (viền, phân cách)
        "neutral-lighter": "#F8F9FA", // Xám rất nhạt (nền phụ, viền nhẹ)

        // Lưu ý: Tailwind đã có sẵn màu 'white' (#FFFFFF) và 'black' (#000000)
        // Bạn không cần định nghĩa lại trừ khi muốn một sắc thái cụ thể.
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      fontFamily: {
        // Đặt tên 'sans' để ghi đè font sans-serif mặc định
        // Hoặc bạn có thể đặt tên khác như 'body' hoặc 'inter'
        poppins: ["Poppins", ...defaultTheme.fontFamily.sans],
        // Nếu bạn muốn dùng một font khác cho tiêu đề (ví dụ: Poppins)
        // heading: ['Poppins', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
export default config;
