#ifndef NETWORKMANAGER_H
#define NETWORKMANAGER_H

#include <SFML/Network.hpp>
#include <sstream>
#include "depend/picojson.h"

struct ACTION {
    std::string path;
    std::string action;
    ACTION(){}
    ACTION(std::string path_, std::string action_) : path(path_), action(action_) {}
};

class NetworkManager {
public:
    static inline NetworkManager& i() {
        static NetworkManager _instance;
        return _instance;
    }

    std::string hostIP;

    ACTION files[1000];
    int change_count = 0;

    NetworkManager();
    enum NETWORKSTATUS {SUCCEED, DB_ERROR, CONNECTION_ERROR, WRONG_PASS, NOT_EXISTS, NAME_TAKEN};
    NETWORKSTATUS fetchChanges(const int version);
    bool downloadFile(std::string server, std::string file, std::string dest);

private:
    NETWORKSTATUS getData(const std::string& request);
    NETWORKSTATUS postData(const std::string& request, const std::ostringstream& data);

    sf::Http http;
    sf::Http::Response res;
};

#endif // NETWORKMANAGER_H
