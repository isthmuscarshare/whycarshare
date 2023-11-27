txt = """Needing to maintain a vehicle I barely use.
driving is miserable — especially around other drivers
Maintenance 
Maintenance 

Limited Parking options
guilt
The stress of driving, followed by the cost.

Owning a car

Bad for environment and cost
Paying for it (maintenance, insurance, etc.) when I use it less than weekly, dealing with parking and snow removal in winter
Carbon emissions 
Environmental impacts
cost
Carbon footprint, feelings of guilt about pollution, car allows me an alternative to walking and biking which would be healthier for my body
Parking
Parking
It takes up space when not in use. Maintenance. 
Terrible contribution to climate change which I feel guilty about with every trip. Mostly we bike or walk or use the bus. We only have 2 cars bc my spouse's dad gave him an old car. We don't use that one hardly at all, and I'd prefer to have 1 car. 
fixing it

using gas, maintenance, parking, takes up space
cost
Cost of ownership like maintenance, repairs, insurance, etc.
Obviously there's a cost involved. 
Carbon emissions, it’s inefficient for in-town use and using it in town contributes to the myriad problems that stem from car-centric infrastructure in cities. Cars are also money pits.
Expense and liability
Maintenance 
the city of madison screwing over low income renters who own a car by removing street parking where they live
inefficiency
parking, emissions
Nothing
Maintenance
Cost of ownership
Driving.  Dealing with maintenance. 
expense
The driving in WI is hairy with the drunk drivers and people not letting you merge on exits because of that overwhelming midwestern niceness 
Environmental impact, dangerous, expensive 
Shoveling the driveway and scraping ice off the window.
Costs and maintenance; don’t like driving in general


costs
Maintenance and trying to keep track of when to do things.  

Maintaining it
everything else lol
Cost and maintenance 
Looking for parking
Adding pollution to our planet 




Contributing to pollution and congestion
Oil changes
Cost


Parking (street parking at home, garage parking at work) is either complicated (remembering all the various on-street rules on different days at different times at home, paying for and finding open parking spots at work)
Maintenance """


from collections import Counter
list1=txt.replace('\n',' ').replace('.',' ').replace(',',' ').replace('(',' ').replace(')',' ').lower().split()
x = Counter(list1)

# res = [{'text':a,'count': b} for a,b in sorted(x.items(), key=lambda pair: pair[1], reverse=True)]

for a,b in sorted(x.items(), key=lambda pair: pair[1], reverse=True):
    print('{'+f' text: "{a}", count: {b} '+'},')