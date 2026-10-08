#!/usr/bin/env ruby
# Maakt previews van de projectsites met headless Chrome.
#
#   ruby scripts/previews.rb            # alle projecten
#   ruby scripts/previews.rb minipol    # alleen deze id's
#
# Resultaat: assets/previews/<id>.jpg (1280x800, verkleind naar 640 breed).

require "yaml"
require "fileutils"
require "tmpdir"

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT = File.expand_path("..", __dir__)
OUT = File.join(ROOT, "assets", "previews")
TIMEOUT = 30
FileUtils.mkdir_p(OUT)

projects = YAML.load_file(File.join(ROOT, "_data", "projects.yml"))
projects.select! { |p| ARGV.include?(p["id"]) } unless ARGV.empty?
# Zonder url (bijv. een eigen foto als preview) slaan we het project over.
projects.select! { |p| p["preview_url"] || p["url"] }

projects.each do |p|
  png = File.join(OUT, "#{p["id"]}.png")
  jpg = File.join(OUT, "#{p["id"]}.jpg")
  print "#{p["id"].ljust(26)} "
  pid = spawn(CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
              "--window-size=1280,800", "--virtual-time-budget=8000",
              "--user-data-dir=#{Dir.mktmpdir("previews-chrome")}",
              "--screenshot=#{png}", p["preview_url"] || p["url"], out: File::NULL, err: File::NULL)
  # Sommige sites blijven laden; na TIMEOUT seconden geven we het op.
  deadline = Time.now + TIMEOUT
  sleep 0.5 while Process.waitpid(pid, Process::WNOHANG).nil? && Time.now < deadline
  if Time.now >= deadline
    Process.kill("KILL", pid) rescue nil
    Process.wait(pid) rescue nil
  end
  if File.exist?(png)
    system("sips", "-s", "format", "jpeg", "-s", "formatOptions", "75",
           "--resampleWidth", "640", png, "--out", jpg, out: File::NULL)
    File.delete(png)
    puts "ok"
  else
    puts "mislukt"
  end
end
