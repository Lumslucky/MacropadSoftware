import os

path = "dist"

filelist = os.listdir("../" + path)

print(filelist)

# open("./dist/" + filelist[2])

for element in filelist:
    if " " in element:
        newname = element.replace(" ", "-")
        os.rename("../" + path + "/" + element,"../" + path + "/" + newname)