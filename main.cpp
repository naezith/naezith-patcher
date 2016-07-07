#include <iostream>
#include <Windows.h>
#include <fstream>
#include "NetworkManager.h"

using namespace std;

int main(int argc, char * argv[]){
    SetConsoleTitle("Remnants of Naezith - Patcher");
    // Close if it's opened manually
    if(argc < 4 || strcmp(argv[1], "update") != 0){
        ShellExecute(GetDesktopWindow(), "open", "naezith.exe", "", NULL, SW_SHOWNORMAL);
        return 0;
    }
    int version = atoi(argv[2]);
    int versionInServer = atoi(argv[3]);
    if(version >= versionInServer){
        std::cout << "IMPORTANT: This is something not expected, contact the developer twitter.com/naezith about this. " <<
        "There probably happened a big update which patcher can't update properly. " <<
        "He will probably ask you to download the whole game again." << std::endl;
        cin.get(); return -1;
    }
    cout << "\n Your client needs update, please wait while it's updating automatically." << endl;
    cout << "\n\n Current Version : " << version << endl;
    cout << "\n Target Version : " << versionInServer << endl;

    cout << "\n\n Checking the difference between versions..." << endl;
    // Get file paths and actions
    if(NetworkManager::i().fetchChanges(version) != NetworkManager::SUCCEED){
        cout << " FetchChanges failed!" << endl;
        cin.get(); return -1;
    }

    // Do actions for paths
    cout << " -> Executing Actions..." << endl;
    for(int i = 0; i < NetworkManager::i().change_count; ++i){
        ACTION& act = NetworkManager::i().files[i];
        std::cout << "File : " << act.path << " , Action : " << act.action << std::endl;
        if(act.path == "patcher.exe"){
            cout << "Patcher is updated, you have to download the game again. Ask naezith about it." << endl;
            cin.get(); return -1;
        }
        if(act.path.find("replays") == string::npos){
            std::string pathToRemove = ".\\" + act.path;
            ifstream fin(pathToRemove.c_str());
            if (fin){
                cout << "File found, deleting..." << endl;
                fin.close();
                if(remove(pathToRemove.c_str()) != 0){
                    cout << " Could not remove " << pathToRemove << endl;
                    cin.get(); exit(-1);
                }
            }
            if(act.action == "add"){
                if(!NetworkManager::i().downloadFile(NetworkManager::i().hostIP, act.path, "")){
                    cin.get(); exit(-1);
                }
            }
        }
    }

    // Run the game
    ofstream out("data/version.rond", ios::out);
    out << versionInServer;
    out.close();
    cout << " -> Update successful, Launching the game..." << endl;
    ShellExecute(GetDesktopWindow(), "open", "naezith.exe", "", NULL, SW_SHOWNORMAL);
    return 0;
}
