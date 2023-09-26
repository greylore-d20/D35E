import json
import argparse
import os
import string
import random
import base64
import sys
from git import Repo
import requests
import subprocess



parser = argparse.ArgumentParser()
parser.add_argument('-v','--version', nargs='?', help='Version')
parser.add_argument('-u','--user', nargs='?', help='Icon storage server username')
parser.add_argument('-s','--server', nargs='?', help='Icon storage server')
parser.add_argument('-t','--token', nargs='?', help='GitLab PAT')
parser.add_argument('-i','--icons-only', action='store_true', default=False)
parser.add_argument('-f','--hotfix', action='store_true', default=False)
parser.add_argument('-n','--no-push', action='store_true', default=False)

args = parser.parse_args()
version = args.version
user = args.user
server = args.server

if not args.icons_only:
    repo = Repo(os.getcwd())
    assert not repo.bare


    f = open("version.yaml", "w")
    f.write("variables:\n")
    f.write("    VERSION: \'"+version+'\'\n')
    f.close()


    with open('system.json') as json_file:
        data = json.load(json_file)
        data['version'] = version
        packs = data['packs']
    with open("system.json", "w") as fp:
        json.dump(data, fp, indent=4)
    repo.git.add("system.json")
    print("Updated system.json")


    print("Unpacking and changing line endings")
    for pack in packs:
        packPath = pack['path'].replace("./packs/","")
        os.system("fvtt package unpack "+packPath+" --outputDirectory source/"+packPath+" --inputDirectory packs/")

        # For each unpackaged pack, change all file line endings to windows line endings
        for root, dirs, files in os.walk("source/"+packPath):
            for file in files:
                WINDOWS_LINE_ENDING = b'\r\n'
                UNIX_LINE_ENDING = b'\n'
                file_path = "source/"+packPath+"/"+file
                with open(file_path, 'rb') as open_file:
                    content = open_file.read()
                content = content.replace(UNIX_LINE_ENDING, WINDOWS_LINE_ENDING)

                with open(file_path, 'wb') as open_file:
                    open_file.write(content)

    headers = { 'PRIVATE-TOKEN':args.token}
    params = {'title': version}
    response = requests.get('https://gitlab.com/api/v4/projects/dragonshorn%2FD35E/milestones', headers=headers, params=params)
    response_data = json.loads(response.text)
    milestone_id = response_data[0]['id']
    response = requests.get('https://gitlab.com/api/v4/projects/dragonshorn%2FD35E/milestones/'+str(milestone_id)+"/issues", headers=headers)
    response_data = json.loads(response.text)

    changelog_html = "<!-- %s -->\n" % version
    changelog_html = changelog_html + "<h2>" + version + "</h2>\n<h3>Changes</h3>\n<ul>\n"
    with open("changelogs/changelog.%s.md" % version, "w") as fp:
        fp.write('# Issues fixed\n')
        for issue in response_data:
            if issue['state'] == 'closed':
                fp.write('- [#{}](https://gitlab.com/dragonshorn/D35E/-/issues/{}) - {}\n'.format(issue['iid'], issue['iid'], issue['title']))
                changelog_html = changelog_html + "<li> <a href='https://gitlab.com/dragonshorn/D35E/-/issues/{}'>#{}</a> - {} </li>\n".format(issue['iid'], issue['iid'], issue['title'])
    print("Created changelog")
    changelog_html = changelog_html + "</ul>\n"

    with open("templates/welcome-screen.html", "r") as f:
        data = f.read()
        if not ("<!-- %s -->" % version) in data:
            data = data.replace("<!-- NEW VERSION FIELD -->","<!-- NEW VERSION FIELD -->\n"+changelog_html)
        else:
            print("Version %s already added to Welcome Screen" % version)

    with open("templates/welcome-screen.html", "w") as fp:
        fp.write(data)

    repo.git.add("changelogs/changelog.%s.md" % version)
    repo.git.add("templates/welcome-screen.html")
    repo.git.add("version.yaml")
    os.system("git add -A source/*")

    repo.git.commit('-m', 'Release %s' % version, author='rughalt@gmail.com')

if os.path.exists("dnd35e-icons.tbz2"):
    os.remove("dnd35e-icons.tbz2")
p = subprocess.run(["tar", "-cvjSf", "dnd35e-icons.tbz2","icons"])
subprocess.run(["scp", "dnd35e-icons.tbz2", f"{user}@{server}:/home/dragonsh/lotd/D35E/"])

if not args.icons_only and not args.no_push:
    origin = repo.remote(name='origin')
    origin.push()

