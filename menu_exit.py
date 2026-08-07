def show_menu():
    print("\n=== Menu Utama ===")
    print("1. Pilihan 1")
    print("2. Pilihan 2")
    print("3. Pilihan 3")
    print("0. /exit")
    print("==================")

def main():
    while True:
        show_menu()
        choice = input("Pilih opsi: ")

        if choice in ["0", "/exit"]:
            print("\nKode exit:", "/exit")
            break
        elif choice == "1":
            print("\nAnda memilih Pilihan 1")
        elif choice == "2":
            print("\nAnda memilih Pilihan 2")
        elif choice == "3":
            print("\nAnda memilih Pilihan 3")
        else:
            print("\nOpsi tidak valid!")

if __name__ == "__main__":
    main()
