import requests

def clear_drive_data():
    try:
        # Thay đổi URL phù hợp với môi trường của bạn
        url = "http://localhost:3000/api/drive/clear"
        
        # Gọi API với phương thức DELETE
        response = requests.delete(url)
        
        # Kiểm tra kết quả
        if response.status_code == 200:
            data = response.json()
            print(f"Đã xóa thành công {data['deletedCount']} file/thư mục")
            print(f"Thông báo: {data['message']}")
        else:
            print(f"Lỗi: {response.json().get('error', 'Không xác định')}")
            
    except Exception as e:
        print(f"Có lỗi xảy ra: {str(e)}")

# Sử dụng hàm
if __name__ == "__main__":
    if input("Bạn có chắc chắn muốn xóa tất cả dữ liệu? (y/n): ").lower() == 'y':
        clear_drive_data()
    else:
        print("Đã hủy thao tác xóa")