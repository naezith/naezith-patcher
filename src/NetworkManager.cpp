#include <fstream>
#include "NetworkManager.h"
#include "depend/picojson.h"

NetworkManager::NetworkManager():
    hostIP("http://ron.doomdns.com/"),
    http(hostIP, 3000) {
}

NetworkManager::NETWORKSTATUS NetworkManager::fetchChanges(const int version) {
    std::ostringstream data;
    data << "version=" << version;
    std::cout << "Fetching changes..." << std::endl;
    NetworkManager::NETWORKSTATUS status = postData("fetchChanges", data);
    change_count = 0;
    picojson::value respond;
    std::string err = picojson::parse(respond, res.getBody());
    if (!err.empty()) std::cerr << err << std::endl;
    else {
        const picojson::value::object& obj = respond.get<picojson::object>();
        for (picojson::value::object::const_iterator i = obj.begin(); i != obj.end(); ++i) {
            if(i->first == "status") status = (NetworkManager::NETWORKSTATUS)atoi(i->second.to_str().c_str());
            else if(i->first == "changes") {
                picojson::value::array changes = i->second.get<picojson::array>();
                change_count = changes.size();
                for(unsigned i = 0; i < changes.size(); ++i) {
                    files[i].action = changes[i].get("action").to_str();
                    files[i].path = changes[i].get("path").to_str();
                }
                std::cout << " There are " << change_count << " files have been changed." << std::endl;
            }
        }
    }
    return status;
}

bool NetworkManager::downloadFile(std::string server, std::string file, std::string dest){
    std::cout << " Downloading : " << file;
    // Download file
    sf::Http http;
	http.setHost(server);
	sf::Http::Request request;
	request.setMethod(sf::Http::Request::Get);
	std::string uri = std::string("/Release/" + file);
	request.setUri(uri);
	sf::Http::Response response = http.sendRequest(request);

	if(response.getStatus() != sf::Http::Response::Ok){
        std::cout << " -> Download failed, Status: " << response.getStatus() << std::endl;
		return false;
    }

	std::string body = response.getBody();



    dest.append(file);
    std::cout << " -> Saved!" << std::endl;

    std::ofstream out(dest.c_str(), std::ios::out | std::ios::binary);
    if(!out.is_open()){
        std::cout << " Could not save the file. It might be in use by some other program or probably the folders are missing. "
        << "For example if the file is \"data/resources/new_folder/new_file.png\" and the \"new_folder\" is missing, you have to create it manually. Then it can save without issues. " << std::endl;
        return false;
    }
    out.write(body.data(), sizeof(char)*body.size());
    out.close();
	return true;
}


NetworkManager::NETWORKSTATUS NetworkManager::postData(const std::string& request, const std::ostringstream& data) {
    sf::Http::Request req("/" + request, sf::Http::Request::Post);
    req.setBody(data.str());

    res = http.sendRequest(req);

    return res.getStatus() == sf::Http::Response::Ok ? (NetworkManager::NETWORKSTATUS)atoi(res.getBody().c_str()) : CONNECTION_ERROR;
}

NetworkManager::NETWORKSTATUS NetworkManager::getData(const std::string& request) {
    sf::Http::Request req("/" + request, sf::Http::Request::Get);

    res = http.sendRequest(req);

    return res.getStatus() == sf::Http::Response::Ok ? (NetworkManager::NETWORKSTATUS)atoi(res.getBody().c_str()) : CONNECTION_ERROR;
}
