import java.util.Scanner;

public class MenuExit {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        while (true) {
            showMenu();
            System.out.print("Pilih opsi: ");
            String choice = scanner.nextLine().trim();
            
            if (choice.equals("0") || choice.equals("/exit")) {
                System.out.println("\nKode exit: /exit");
                break;
            } else if (choice.equals("1")) {
                System.out.println("\nAnda memilih Pilihan 1");
            } else if (choice.equals("2")) {
                System.out.println("\nAnda memilih Pilihan 2");
            } else if (choice.equals("3")) {
                System.out.println("\nAnda memilih Pilihan 3");
            } else {
                System.out.println("\nOpsi tidak valid!");
            }
        }
        
        scanner.close();
    }
    
    public static void showMenu() {
        System.out.println("\n=== Menu Utama ===");
        System.out.println("1. Pilihan 1");
        System.out.println("2. Pilihan 2");
        System.out.println("3. Pilihan 3");
        System.out.println("0. /exit");
        System.out.println("==================");
    }
}
