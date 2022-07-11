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

args = parser.parse_args()
version = args.version
user = args.user
server = args.server

repo = Repo(os.getcwd())
assert not repo.bare

with open('system.json') as json_file:
    data = json.load(json_file)
    data['version'] = version
with open("system.json", "w") as fp:
    json.dump(data, fp, indent=4) 
repo.git.add("system.json")
print("Updated system.json")

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

repo.git.commit('-m', 'Release %s' % version, author='rughalt@gmail.com')


p = subprocess.run("tar", "-cvjSf", "dnd35e-icons.tbz2", "icons")
subprocess.run(["scp", "dnd35e-icons.tbz2", f"{user}@{server}:/home/dragonsh/special/"])

# origin = repo.remote(name='origin')
# origin.push()
print("Commited, you can push now")
